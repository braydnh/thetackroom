/**
 * GET /api/cron/process-payouts
 *
 * Vercel Cron job — runs every 15 minutes.
 * Finds all orders where:
 *   - status = "delivered" AND dispute_window_ends_at <= NOW()
 *   - OR status = "payment_captured" AND pickup_method = "local_pickup" AND buyer_confirmed_at IS NOT NULL
 *
 * For each: creates a Stripe Transfer to the seller's connected account,
 * then marks the order as "completed".
 *
 * Configure in vercel.json:
 *   { "crons": [{ "path": "/api/cron/process-payouts", "schedule": "every 15 minutes" }] }
 *
 * Secured with CRON_SECRET — Vercel passes it as Authorization: Bearer <secret>
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { payoutReleasedSellerEmail, leaveReviewBuyerEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();

  // Find orders ready for payout
  const { data: orders, error } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, seller_payout_amt, stripe_payment_intent_id, stripe_charge_id, listing_id, listings(title)")
    .or(
      `and(status.eq.delivered,dispute_window_ends_at.lte.${now}),` +
      `and(status.eq.dispute_window,dispute_window_ends_at.lte.${now})`
    )
    .limit(50); // Process in batches to stay within cron timeout

  if (error) {
    console.error("process-payouts query error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { order_id: string; status: "ok" | "error"; detail?: string }[] = [];

  for (const order of (orders ?? [])) {
    try {
      // Get seller's Stripe account ID
      const { data: profile } = await admin
        .from("profiles")
        .select("stripe_account_id")
        .eq("id", order.seller_id)
        .single();

      if (!profile?.stripe_account_id) {
        throw new Error("Seller has no Stripe account");
      }

      // Find the charge ID if not stored (look up via payment intent)
      let chargeId = (order as any).stripe_charge_id as string | null;
      if (!chargeId && (order as any).stripe_payment_intent_id) {
        const pi = await stripe.paymentIntents.retrieve((order as any).stripe_payment_intent_id);
        chargeId = typeof pi.latest_charge === "string" ? pi.latest_charge : null;
        if (chargeId) {
          await admin.from("orders").update({ stripe_charge_id: chargeId }).eq("id", order.id);
        }
      }

      if (!chargeId) throw new Error("No charge ID found");

      // Create Stripe Transfer — platform → seller connected account
      const transfer = await stripe.transfers.create({
        amount: order.seller_payout_amt,
        currency: "aud",
        destination: profile.stripe_account_id,
        source_transaction: chargeId,
        metadata: {
          order_id: order.id,
          listing_id: (order as any).listing_id ?? "",
        },
        description: `Payout for order ${order.id}`,
      });

      // Mark order completed
      await admin.from("orders").update({
        status: "completed",
        stripe_transfer_id: transfer.id,
        payout_completed_at: new Date().toISOString(),
      }).eq("id", order.id);

      // Mark listing as sold
      await admin.from("listings").update({ status: "sold" }).eq("id", (order as any).listing_id);

      // Increment seller's total_sales count
      await (admin as any).rpc("increment_total_sales", { user_id: order.seller_id });

      // Email seller + in-app notification
      try {
        const listingTitle = (order as any).listings?.title ?? "Your item";
        const [{ data: sellerProfile }, sellerAuth] = await Promise.all([
          admin.from("profiles").select("display_name, username").eq("id", order.seller_id).single(),
          admin.auth.admin.getUserById(order.seller_id),
        ]);
        const sellerEmail = (sellerAuth as any).data?.user?.email;
        const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";

        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: `Your payout has been released — ${listingTitle}`,
            html: payoutReleasedSellerEmail({
              sellerName,
              listingTitle,
              amount: formatAUD(order.seller_payout_amt),
              orderId: order.id,
            }),
          });
        }

        await admin.from("notifications").insert({
          user_id: order.seller_id,
          type: "payout_released",
          title: "Your payout has been released!",
          body: `Funds for "${listingTitle}" are on their way to your account.`,
          link: `/orders/${order.id}`,
        });

        // Email buyer — prompt to leave a review
        const [{ data: buyerProfile }, buyerAuth] = await Promise.all([
          admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
          admin.auth.admin.getUserById((order as any).buyer_id),
        ]);
        const buyerEmail = (buyerAuth as any).data?.user?.email;
        const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";

        if (buyerEmail) {
          await sendEmail({
            to: buyerEmail,
            subject: `How was your order? Leave a review — ${listingTitle}`,
            html: leaveReviewBuyerEmail({
              buyerName,
              listingTitle,
              sellerName,
              orderId: order.id,
            }),
          });
        }

        await admin.from("notifications").insert({
          user_id: (order as any).buyer_id,
          type: "review_prompt",
          title: "How was your order?",
          body: `Leave a review for "${listingTitle}" and help the community.`,
          link: `/orders/${order.id}`,
        });
      } catch (err) {
        console.error(`Payout email/notification failed for order ${order.id}:`, err);
      }

      results.push({ order_id: order.id, status: "ok" });
    } catch (err: any) {
      console.error(`Payout failed for order ${order.id}:`, err.message);
      results.push({ order_id: order.id, status: "error", detail: err.message });
    }
  }

  // Also handle: tracking deadline expired without tracking submission → offer refund
  const trackingDeadline = new Date().toISOString();
  const { data: overdueOrders } = await admin
    .from("orders")
    .select("id, buyer_id, listing_id")
    .eq("status", "awaiting_shipment")
    .eq("pickup_method", "shipping")
    .lt("tracking_deadline", trackingDeadline)
    .limit(20);

  for (const order of (overdueOrders ?? [])) {
    try {
      // Move to a state that signals buyer can request refund
      // We'll use "disputed" with a seller_notes flag for now
      await admin.from("orders").update({
        status: "disputed",
        seller_notes: "tracking_deadline_exceeded",
      }).eq("id", order.id);

      // Restore listing to active
      await admin.from("listings").update({ status: "active" }).eq("id", order.listing_id);

      results.push({ order_id: order.id, status: "ok", detail: "tracking_deadline_expired" });
    } catch (err: any) {
      results.push({ order_id: order.id, status: "error", detail: err.message });
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
