/**
 * POST /api/webhooks/trackingmore
 *
 * Handles Trackingmore delivery webhook events.
 * When a parcel status is "delivered":
 *   1. Updates order status: shipped → dispute_window
 *   2. Sets dispute_window_ends_at = now + 48 hours
 *   3. Emails + notifies both buyer and seller
 *
 * Trackingmore sends a plain POST with JSON — no HMAC by default on free tier.
 * Set TRACKINGMORE_WEBHOOK_SECRET to enable signature verification if on paid plan.
 *
 * Configure the webhook URL in Trackingmore dashboard:
 *   https://admin.trackingmore.com/developer/webhooks
 *   URL: https://your-domain.com/api/webhooks/trackingmore
 */

import { NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { itemDeliveredSellerEmail, itemDeliveredBuyerEmail } from "@/lib/emails";

function verifyHmac(body: string, signature: string, secret: string): boolean {
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return diff === 0;
}

export async function POST(req: Request) {
  const body = await req.text();

  const secret = process.env.TRACKINGMORE_WEBHOOK_SECRET ?? "";
  const signature = req.headers.get("trackingmore-hmac-sha256") ?? "";
  if (secret && signature && !verifyHmac(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Trackingmore v4 webhook shape:
  // { event: "tracking_updated", data: { tracking_number, tag, order_id, ... } }
  const tracking = payload?.data ?? payload; // fallback to root for older versions
  const status: string = tracking?.tag ?? tracking?.status ?? "";
  const orderId: string = tracking?.order_id ?? "";
  const trackingNumber: string = tracking?.tracking_number ?? "";

  // Only act on delivery
  if (!["delivered", "Delivered"].includes(status)) {
    return NextResponse.json({ received: true });
  }

  if (!orderId && !trackingNumber) {
    return NextResponse.json({ error: "Cannot identify order" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Find order — prefer order_id field, fall back to aftership_tracking_id (reused for Trackingmore IDs)
  let query = admin
    .from("orders")
    .select("id, status, seller_id, buyer_id, listing_id, listings(title)");

  if (orderId) {
    query = query.eq("id", orderId) as any;
  } else {
    query = query.eq("aftership_tracking_id", trackingNumber) as any;
  }

  const { data: order } = await (query as any).single();

  if (!order) {
    console.warn("Trackingmore webhook: order not found", { orderId, trackingNumber });
    return NextResponse.json({ received: true });
  }

  // Idempotency — only advance from "shipped"
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

  console.log(`Order ${order.id} entered dispute window via Trackingmore. Ends: ${disputeWindowEndsAt}`);

  // Email + notify buyer and seller (non-blocking)
  try {
    const listingTitle = (order as any).listings?.title ?? "Your item";

    const [
      { data: sellerProfile }, sellerAuth,
      { data: buyerProfile }, buyerAuth,
    ] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
      admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
    ]);

    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";

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
