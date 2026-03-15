/**
 * POST /api/admin/orders/[id]/sync-payment
 *
 * Admin action to manually sync a pending_payment order with Stripe.
 * Checks the PaymentIntent status — if succeeded, advances the order
 * exactly as the webhook would have.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { newOrderEmail, orderConfirmedBuyerEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((callerProfile as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, status, stripe_payment_intent_id, seller_id, buyer_id, subtotal, shipping_amount, pickup_method, listing_id, listings(title)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const currentStatus = (order as any).status;
  const syncableStatuses = ["pending_payment", "payment_captured"];
  if (!syncableStatuses.includes(currentStatus)) {
    return NextResponse.json({ error: `Order is already ${currentStatus}` }, { status: 400 });
  }

  const piId = (order as any).stripe_payment_intent_id;
  if (!piId) return NextResponse.json({ error: "No payment intent on this order" }, { status: 400 });

  // If already payment_captured, just advance to the correct next status without re-checking Stripe
  if (currentStatus === "payment_captured") {
    const newStatus = (order as any).pickup_method === "shipping" ? "awaiting_shipment" : "payment_captured";
    if (newStatus === "payment_captured") {
      return NextResponse.json({ error: "Order is a pickup order — manually advance when ready" }, { status: 400 });
    }
    await admin.from("orders").update({ status: newStatus }).eq("id", orderId);
    if ((order as any).listing_id) {
      await admin.from("listings").update({ status: "reserved" }).eq("id", (order as any).listing_id);
    }
    return NextResponse.json({ success: true, newStatus });
  }

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch {
    return NextResponse.json({ error: "Could not retrieve PaymentIntent from Stripe" }, { status: 500 });
  }

  // If payment was never completed, cancel the order and void the intent
  if (pi.status !== "succeeded") {
    try { await stripe.paymentIntents.cancel(piId); } catch { /* already cancelled */ }
    await admin.from("orders").update({ status: "cancelled" }).eq("id", orderId);
    return NextResponse.json({ success: true, newStatus: "cancelled", detail: `PaymentIntent was ${pi.status}` });
  }

  const newStatus = (order as any).pickup_method === "shipping" ? "awaiting_shipment" : "payment_captured";

  await admin
    .from("orders")
    .update({ status: newStatus, stripe_charge_id: pi.latest_charge as string | null })
    .eq("id", orderId);

  if ((order as any).listing_id) {
    await admin.from("listings").update({ status: "reserved" }).eq("id", (order as any).listing_id);
  }

  try {
    const listingTitle = ((order as any).listings as any)?.title ?? "Your item";
    const totalAmount = formatAUD(pi.amount_received);

    const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }, buyerAuth] = await Promise.all([
      admin.from("profiles").select("username, display_name").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
      admin.from("profiles").select("username, display_name").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
    ]);

    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "A buyer";

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `You've made a sale — ${listingTitle}`,
        html: newOrderEmail({ sellerName, buyerName, listingTitle, amount: formatAUD((order as any).subtotal), orderId }),
      });
    }
    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Order confirmed — ${listingTitle}`,
        html: orderConfirmedBuyerEmail({ buyerName, listingTitle, sellerName, amount: totalAmount, orderId, pickupMethod: (order as any).pickup_method }),
      });
    }
  } catch (err) {
    console.error("sync-payment: email failed:", err);
  }

  return NextResponse.json({ success: true, newStatus });
}
