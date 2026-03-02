/**
 * POST /api/webhooks/17track
 *
 * Handles 17track delivery webhook events.
 * When a parcel tag changes to "Delivered":
 *   1. Updates order status: shipped → dispute_window
 *   2. Sets dispute_window_ends_at = now + 48 hours
 *
 * 17track V2.4 signature (sign field in payload body):
 *   SHA256(event + "/" + JSON.stringify(data) + "/" + secret)
 *
 * V2.4 payload shape:
 * {
 *   sign: "...",
 *   event: "TRACKING_UPDATED",
 *   data: {                          ← object in V2.4, array in older versions
 *     number: "trackingNumber",
 *     carrier: 100066,
 *     tag: "Delivered",
 *     extra: { order_no: "orderId" }
 *   }
 * }
 */

import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { itemDeliveredSellerEmail, itemDeliveredBuyerEmail } from "@/lib/emails";

function verifySignature(event: string, data: unknown, sign: string, secret: string): boolean {
  const expected = createHash("sha256")
    .update(`${event}/${JSON.stringify(data)}/${secret}`)
    .digest("hex");
  if (expected.length !== sign.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sign.charCodeAt(i);
  }
  return diff === 0;
}

async function handleDelivery(tracking: any) {
  const orderId = tracking?.extra?.order_no as string | undefined;
  const trackingNumber = tracking?.number as string | undefined;

  if (!orderId && !trackingNumber) return;

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, status, seller_id, buyer_id, listing_id, listings(title)");

  if (orderId) {
    query = query.eq("id", orderId) as any;
  } else {
    query = query.eq("aftership_tracking_id", trackingNumber!) as any;
  }

  const { data: order } = await (query as any).single();

  if (!order) {
    console.warn("17track webhook: order not found", { orderId, trackingNumber });
    return;
  }

  // Idempotency — only advance if still in "shipped" state
  if (order.status !== "shipped") return;

  const disputeWindowEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await admin
    .from("orders")
    .update({ status: "dispute_window", dispute_window_ends_at: disputeWindowEndsAt })
    .eq("id", order.id);

  console.log(`Order ${order.id} entered dispute window via 17track. Ends: ${disputeWindowEndsAt}`);

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

export async function POST(req: Request) {
  let payload: any;
  try {
    payload = JSON.parse(await req.text());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify signature if secret is configured
  const secret = process.env.SEVENTEEN_TRACK_WEBHOOK_SECRET ?? "";
  if (secret) {
    const sign = payload?.sign ?? "";
    if (!verifySignature(payload.event, payload.data, sign, secret)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // data can be an object (V2.4) or an array (older versions)
  const raw = payload?.data;
  const updates: any[] = Array.isArray(raw) ? raw : raw ? [raw] : [];

  for (const tracking of updates) {
    if (tracking?.tag === "Delivered") {
      await handleDelivery(tracking);
    }
  }

  return NextResponse.json({ received: true });
}

// 17track sends a GET to verify the URL is reachable before saving
export async function GET() {
  return NextResponse.json({ ok: true });
}
