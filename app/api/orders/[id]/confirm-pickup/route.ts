/**
 * POST /api/orders/[id]/confirm-pickup
 *
 * Seller marks a local pickup order as completed.
 * Triggers immediate Stripe Transfer to the seller's connected account.
 *
 * Only callable by the seller on an order with:
 *   - pickup_method = "local_pickup"
 *   - status = "payment_captured"
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

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
    .select("id, seller_id, buyer_id, status, pickup_method, seller_payout_amt, stripe_payment_intent_id, stripe_charge_id, listing_id")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((order as any).pickup_method !== "local_pickup") {
    return NextResponse.json({ error: "Not a local pickup order" }, { status: 400 });
  }
  if ((order as any).status !== "payment_captured") {
    return NextResponse.json({ error: "Order is not awaiting pickup" }, { status: 400 });
  }

  // Get seller's Stripe account
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", (order as any).seller_id)
    .single();

  if (!profile?.stripe_account_id) {
    return NextResponse.json({ error: "Seller has no Stripe account" }, { status: 400 });
  }

  // Resolve charge ID
  let chargeId = (order as any).stripe_charge_id as string | null;
  if (!chargeId && (order as any).stripe_payment_intent_id) {
    const pi = await stripe.paymentIntents.retrieve((order as any).stripe_payment_intent_id);
    chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
  }

  if (!chargeId) {
    return NextResponse.json({ error: "No charge found for this order" }, { status: 400 });
  }

  // Create immediate Stripe Transfer
  const transfer = await stripe.transfers.create({
    amount: (order as any).seller_payout_amt,
    currency: "aud",
    destination: profile.stripe_account_id,
    source_transaction: chargeId,
    metadata: { order_id: id, type: "local_pickup_payout" },
  });

  // Mark order completed
  await admin.from("orders").update({
    status: "completed",
    stripe_transfer_id: transfer.id,
    stripe_charge_id: chargeId,
    buyer_confirmed_at: new Date().toISOString(),
    payout_completed_at: new Date().toISOString(),
  }).eq("id", id);

  // Mark listing sold
  await admin.from("listings").update({ status: "sold" }).eq("id", (order as any).listing_id);

  return NextResponse.json({ success: true });
}
