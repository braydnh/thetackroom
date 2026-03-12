/**
 * POST /api/webhooks/aftership
 *
 * Handles AfterShip delivery webhook events.
 * When a parcel is marked "Delivered":
 *   1. Updates order status: shipped → delivered
 *   2. Sets dispute_window_ends_at = now + 48 hours
 *
 * AfterShip signs requests with HMAC-SHA256 using AFTERSHIP_WEBHOOK_SECRET.
 * Header: aftership-hmac-sha256
 */

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { itemDeliveredSellerEmail, itemDeliveredBuyerEmail } from "@/lib/emails";

function verifyHmac(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  // Constant-time comparison
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("aftership-hmac-sha256") ?? "";
  const secret = process.env.AFTERSHIP_WEBHOOK_SECRET ?? "";

  // Verify HMAC signature if secret is configured
  if (secret && !verifyHmac(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const tracking = payload?.msg?.tracking;
  if (!tracking) {
    return NextResponse.json({ received: true }); // Ignore non-tracking events
  }

  const tag = tracking.tag as string; // "Delivered", "InTransit", etc.
  const trackingId = tracking.id as string;
  const orderId = tracking.custom_fields?.order_id as string | undefined;

  // Only act on delivery
  if (tag !== "Delivered") {
    return NextResponse.json({ received: true });
  }

  if (!orderId && !trackingId) {
    return NextResponse.json({ error: "Cannot identify order" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find order — try by order_id from custom_fields first, then by aftership_tracking_id
  let query = admin.from("orders").select("id, status, seller_id, buyer_id, listing_id, listings(title)");
  if (orderId) {
    query = query.eq("id", orderId) as any;
  } else {
    query = query.eq("aftership_tracking_id", trackingId) as any;
  }

  const { data: order } = await (query as any).single();

  if (!order) {
    console.warn("AfterShip webhook: order not found", { orderId, trackingId });
    return NextResponse.json({ received: true });
  }

  // Idempotency — only advance if still in "shipped" state
  if (order.status !== "shipped") {
    return NextResponse.json({ received: true });
  }

  const disputeWindowEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await admin
    .from("orders")
    .update({
      status: "dispute_window",
      dispute_window_ends_at: disputeWindowEndsAt,
    })
    .eq("id", order.id);

  console.log(`Order ${order.id} entered dispute window. Ends: ${disputeWindowEndsAt}`);

  // Email seller + in-app notification
  try {
    const listingTitle = (order as any).listings?.title ?? "Your item";
    const [{ data: sellerProfile }, sellerAuth] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
    ]);
    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `Your item has been delivered — ${listingTitle}`,
        html: itemDeliveredSellerEmail({ sellerName, listingTitle, orderId: order.id }),
      });
    }

    await admin.from("notifications").insert({
      user_id: (order as any).seller_id,
      type: "item_delivered",
      title: "Your item has been delivered!",
      body: `${listingTitle} was delivered. Your payout will be released shortly.`,
      link: `/orders/${order.id}`,
    });

    // Email buyer + in-app notification (dispute window)
    const [{ data: buyerProfile }, buyerAuth] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
    ]);
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";

    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Your item has been delivered — ${listingTitle}`,
        html: itemDeliveredBuyerEmail({ buyerName, listingTitle, disputeWindowEndsAt, orderId: order.id }),
      });
    }

    await admin.from("notifications").insert({
      user_id: (order as any).buyer_id,
      type: "dispute_window",
      title: "Your item has been delivered!",
      body: `You have 48 hours to raise a dispute for "${listingTitle}". After that, the seller will be paid out.`,
      link: `/orders/${order.id}`,
    });

  } catch (err) {
    console.error("Delivery email/notification failed:", err);
  }

  return NextResponse.json({ received: true });
}
