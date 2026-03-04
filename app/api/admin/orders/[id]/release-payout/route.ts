/**
 * POST /api/admin/orders/[id]/release-payout
 *
 * Admin action to manually trigger a Stripe Transfer for an order that was
 * completed (e.g. manually via Supabase) without going through the normal
 * payout flow, leaving the seller unpaid.
 *
 * Safe to call on any completed order that has no stripe_transfer_id yet.
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
    .select("id, status, seller_id, buyer_id, seller_payout_amt, stripe_payment_intent_id, stripe_charge_id, stripe_transfer_id, listing_id, listings(title)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).status !== "completed") {
    return NextResponse.json({ error: `Order is not completed (status: ${(order as any).status})` }, { status: 400 });
  }
  if ((order as any).stripe_transfer_id) {
    return NextResponse.json({ error: "Payout already exists for this order" }, { status: 400 });
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
      await admin.from("orders").update({ stripe_charge_id: chargeId }).eq("id", orderId);
    }
  }

  if (!chargeId) {
    return NextResponse.json({ error: "No charge ID found — cannot create transfer" }, { status: 400 });
  }

  // Create Stripe Transfer
  const transfer = await stripe.transfers.create({
    amount: (order as any).seller_payout_amt,
    currency: "aud",
    destination: sellerProfile.stripe_account_id,
    source_transaction: chargeId,
    metadata: { order_id: orderId, type: "admin_manual_payout" },
    description: `Manual payout for order ${orderId}`,
  });

  // Update order + mark listing sold + increment sales count
  await Promise.all([
    admin.from("orders").update({
      stripe_transfer_id: transfer.id,
      payout_completed_at: new Date().toISOString(),
    }).eq("id", orderId),
    admin.from("listings").update({ status: "sold" }).eq("id", (order as any).listing_id),
    (admin as any).rpc("increment_total_sales", { user_id: (order as any).seller_id }),
  ]);

  // Email seller
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
          orderId,
        }),
      });
    }

    await admin.from("notifications").insert({
      user_id: (order as any).seller_id,
      type: "payout_released",
      title: "Your payout has been released!",
      body: `Funds for "${listingTitle}" are on their way to your account.`,
      link: `/orders/${orderId}`,
    });
  } catch (err) {
    console.error("release-payout: email/notification failed:", err);
  }

  return NextResponse.json({ success: true, transfer_id: transfer.id });
}
