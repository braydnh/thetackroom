/**
 * POST /api/webhooks/17track
 *
 * Handles 17track delivery webhook events.
 * When a parcel tag changes to "Delivered":
 *   1. Updates order status: shipped → dispute_window
 *   2. Sets dispute_window_ends_at = now + 48 hours
 *
 * 17track signs requests with HMAC-SHA256 using the webhook secret.
 * Header: sign
 *
 * Webhook payload shape:
 * {
 *   event: "TRACKING_UPDATED",
 *   data: [{
 *     number: "trackingNumber",
 *     carrier: 100066,
 *     tag: "Delivered",
 *     extra: { order_no: "orderId" }
 *   }]
 * }
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
  const signature = req.headers.get("sign") ?? "";
  const secret = process.env.SEVENTEEN_TRACK_WEBHOOK_SECRET ?? "";

  if (secret && !verifyHmac(body, signature, secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 17track sends an array of tracking updates in data[]
  const updates: any[] = payload?.data ?? [];

  for (const tracking of updates) {
    const tag = tracking?.tag as string; // "Delivered", "InTransit", etc.
    const orderId = tracking?.extra?.order_no as string | undefined;
    const trackingNumber = tracking?.number as string | undefined;

    if (tag !== "Delivered") continue;

    if (!orderId && !trackingNumber) continue;

    const admin = createAdminClient();

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
      console.warn("17track webhook: order not found", { orderId, trackingNumber });
      continue;
    }

    // Idempotency — only advance if still in "shipped" state
    if (order.status !== "shipped") continue;

    const disputeWindowEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    await admin
      .from("orders")
      .update({
        status: "dispute_window",
        dispute_window_ends_at: disputeWindowEndsAt,
      })
      .eq("id", order.id);

    console.log(`Order ${order.id} entered dispute window. Ends: ${disputeWindowEndsAt}`);

    // Email seller + buyer, in-app notifications (non-blocking)
    try {
      const listingTitle = (order as any).listings?.title ?? "Your item";

      const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }, buyerAuth] =
        await Promise.all([
          admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
          admin.auth.admin.getUserById((order as any).seller_id),
          admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
          admin.auth.admin.getUserById((order as any).buyer_id),
        ]);

      const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
      const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";
      const sellerEmail = (sellerAuth as any).data?.user?.email;
      const buyerEmail = (buyerAuth as any).data?.user?.email;

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
  }

  return NextResponse.json({ received: true });
}
