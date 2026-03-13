/**
 * POST /api/orders/[id]/release-early
 *
 * Buyer chooses to release funds before the 48-hour dispute window expires.
 * Triggers an immediate Stripe Transfer to the seller, marks the order completed.
 *
 * Only callable by the buyer on an order with status = "dispute_window".
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { sendEmail } from "@/lib/resend";
import { payoutReleasedSellerEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, status, seller_payout_amt, stripe_payment_intent_id, stripe_charge_id, listing_id, listings(title)")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((order as any).status !== "dispute_window") {
    return NextResponse.json({ error: "Order is not in the dispute window" }, { status: 400 });
  }

  // Get seller's Stripe account
  const { data: sellerProfile } = await admin
    .from("profiles")
    .select("stripe_account_id, display_name, username")
    .eq("id", (order as any).seller_id)
    .single();

  if (!sellerProfile?.stripe_account_id) {
    return NextResponse.json({ error: "Seller has no Stripe account" }, { status: 400 });
  }

  // Resolve charge ID
  let chargeId = (order as any).stripe_charge_id as string | null;
  if (!chargeId && (order as any).stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve((order as any).stripe_payment_intent_id);
    chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
    if (chargeId) {
      await admin.from("orders").update({ stripe_charge_id: chargeId }).eq("id", id);
    }
  }

  if (!chargeId) {
    return NextResponse.json({ error: "No charge found for this order" }, { status: 400 });
  }

  // Create immediate Stripe Transfer
  const transfer = await stripe.transfers.create({
    amount: (order as any).seller_payout_amt,
    currency: "aud",
    destination: sellerProfile.stripe_account_id,
    source_transaction: chargeId,
    metadata: { order_id: id, type: "buyer_early_release" },
  });

  // Mark order completed
  await admin.from("orders").update({
    status: "completed",
    stripe_transfer_id: transfer.id,
    stripe_charge_id: chargeId,
    buyer_confirmed_at: new Date().toISOString(),
    payout_completed_at: new Date().toISOString(),
  }).eq("id", id);

  // Mark listing sold + increment seller total_sales
  await Promise.all([
    admin.from("listings").update({ status: "sold" }).eq("id", (order as any).listing_id),
    (admin as any).rpc("increment_total_sales", { user_id: (order as any).seller_id }),
  ]);

  // Notify seller
  try {
    const listingTitle = ((order as any).listings as any)?.title ?? "your item";
    const sellerAuth = await admin.auth.admin.getUserById((order as any).seller_id);
    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const sellerName = sellerProfile.display_name ?? sellerProfile.username ?? "there";

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `Your payout has been released — ${listingTitle}`,
        html: payoutReleasedSellerEmail({
          sellerName,
          listingTitle,
          amount: formatAUD((order as any).seller_payout_amt),
          orderId: id,
        }),
      });
    }

    await admin.from("notifications").insert({
      user_id: (order as any).seller_id,
      type: "payout_released",
      title: "Your payout has been released!",
      body: `The buyer released funds early for "${listingTitle}". Payment is on its way.`,
      link: `/orders/${id}`,
    });
  } catch (err) {
    console.error("release-early: email/notification failed:", err);
  }

  return NextResponse.json({ success: true });
}
