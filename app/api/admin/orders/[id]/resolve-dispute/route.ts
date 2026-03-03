/**
 * POST /api/admin/orders/[id]/resolve-dispute
 * Admin only — resolve a disputed order by releasing payout or issuing refund.
 * Body: { action: "release" | "refund" }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { sendEmail } from "@/lib/resend";
import { disputeRefundBuyerEmail, disputeRefundSellerEmail, disputeReleasedSellerEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action } = await req.json() as { action: "release" | "refund" };
  if (!["release", "refund"].includes(action)) {
    return NextResponse.json({ error: "action must be 'release' or 'refund'" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, seller_id, buyer_id, seller_payout_amt, stripe_payment_intent_id, stripe_charge_id, listing_id, listings(title)")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).status !== "disputed") {
    return NextResponse.json({ error: "Order is not disputed" }, { status: 400 });
  }

  if (action === "refund") {
    // Issue Stripe refund
    const pi = (order as any).stripe_payment_intent_id as string;
    if (!pi) return NextResponse.json({ error: "No payment intent" }, { status: 400 });

    const piObj = await stripe.paymentIntents.retrieve(pi);
    const chargeId = typeof piObj.latest_charge === "string" ? piObj.latest_charge : null;
    if (!chargeId) return NextResponse.json({ error: "No charge found" }, { status: 400 });

    const refund = await stripe.refunds.create({ charge: chargeId, reason: "fraudulent" });

    await admin.from("orders").update({
      status: "refunded",
      stripe_refund_id: refund.id,
    }).eq("id", id);

    // Restore listing to active
    await admin.from("listings").update({ status: "active" }).eq("id", (order as any).listing_id);

    // Email buyer (refund confirmed) and seller (dispute lost)
    try {
      const listingTitle = (order as any).listings?.title ?? "the item";
      const [
        sellerAuth, buyerAuth,
        { data: sellerProfile }, { data: buyerProfile },
      ] = await Promise.all([
        admin.auth.admin.getUserById((order as any).seller_id),
        admin.auth.admin.getUserById((order as any).buyer_id),
        admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
        admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      ]);
      const sellerEmail = (sellerAuth as any).data?.user?.email;
      const buyerEmail  = (buyerAuth as any).data?.user?.email;
      const sellerName  = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
      const buyerName   = buyerProfile?.display_name  ?? buyerProfile?.username  ?? "there";
      const refundAmount = formatAUD(refund.amount);

      if (buyerEmail) {
        await sendEmail({
          to: buyerEmail,
          subject: `Your refund has been approved — ${listingTitle}`,
          html: disputeRefundBuyerEmail({ buyerName, listingTitle, amount: refundAmount, orderId: id }),
        });
      }
      if (sellerEmail) {
        await sendEmail({
          to: sellerEmail,
          subject: `Dispute resolved — ${listingTitle}`,
          html: disputeRefundSellerEmail({ sellerName, listingTitle, orderId: id }),
        });
      }
    } catch (notifyErr) {
      console.error("Dispute refund notifications failed:", notifyErr);
    }

  } else {
    // Release payout to seller
    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("stripe_account_id")
      .eq("id", (order as any).seller_id)
      .single();

    if (!sellerProfile?.stripe_account_id) {
      return NextResponse.json({ error: "Seller has no Stripe account" }, { status: 400 });
    }

    let chargeId = (order as any).stripe_charge_id as string | null;
    if (!chargeId && (order as any).stripe_payment_intent_id) {
      const pi = await stripe.paymentIntents.retrieve((order as any).stripe_payment_intent_id);
      chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
    }

    if (!chargeId) return NextResponse.json({ error: "No charge found" }, { status: 400 });

    const transfer = await stripe.transfers.create({
      amount: (order as any).seller_payout_amt,
      currency: "aud",
      destination: sellerProfile.stripe_account_id,
      source_transaction: chargeId,
      metadata: { order_id: id, type: "dispute_resolved_release" },
    });

    await admin.from("orders").update({
      status: "completed",
      stripe_transfer_id: transfer.id,
      stripe_charge_id: chargeId,
      payout_completed_at: new Date().toISOString(),
    }).eq("id", id);

    await admin.from("listings").update({ status: "sold" }).eq("id", (order as any).listing_id);

    // Email seller (dispute resolved in their favour)
    try {
      const listingTitle = (order as any).listings?.title ?? "the item";
      const [{ data: sellerProfile }, sellerAuth] = await Promise.all([
        admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
        admin.auth.admin.getUserById((order as any).seller_id),
      ]);
      const sellerEmail = (sellerAuth as any).data?.user?.email;
      const sellerName  = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";

      if (sellerEmail) {
        await sendEmail({
          to: sellerEmail,
          subject: `Dispute resolved in your favour — ${listingTitle}`,
          html: disputeReleasedSellerEmail({
            sellerName,
            listingTitle,
            amount: formatAUD((order as any).seller_payout_amt),
            orderId: id,
          }),
        });
      }
    } catch (notifyErr) {
      console.error("Dispute release notification failed:", notifyErr);
    }
  }

  return NextResponse.json({ success: true });
}
