/**
 * POST /api/webhooks/stripe
 *
 * Handles Stripe webhook events.
 * Currently handles:
 *   - payment_intent.succeeded → creates featured_listings row (for boost purchases)
 *     (checkout payment_intent.succeeded for orders is handled separately via order flow)
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { newOrderEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook verification failed: ${err.message}` }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Stripe Connect account approved ──
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.charges_enabled) {
      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: true, role: "seller" })
        .eq("stripe_account_id", account.id);
    }
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;

    // ── Featured listing boost ──
    if (pi.metadata.type === "featured_listing") {
      const { listing_id, seller_id, slot, ends_at } = pi.metadata;
      if (listing_id && seller_id && slot && ends_at) {
        // Idempotency: skip if already recorded
        const { data: existing } = await supabase
          .from("featured_listings")
          .select("id")
          .eq("stripe_payment_intent_id", pi.id)
          .single();

        if (!existing) {
          await supabase.from("featured_listings").insert({
            listing_id,
            seller_id,
            slot: slot as "homepage" | "search_top",
            stripe_payment_intent_id: pi.id,
            amount_paid: pi.amount_received,
            ends_at,
          });
        }
      }
    }

    // ── Order payment captured ──
    if (pi.metadata.type === "order_payment" && pi.metadata.order_id) {
      const orderId = pi.metadata.order_id;

      await supabase
        .from("orders")
        .update({
          status: "payment_captured",
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: pi.latest_charge as string | null,
        })
        .eq("id", orderId);

      // Mark listing as reserved
      if (pi.metadata.listing_id) {
        await supabase
          .from("listings")
          .update({ status: "reserved" })
          .eq("id", pi.metadata.listing_id);
      }

      // Email seller about the new order
      try {
        const { data: order } = await supabase
          .from("orders")
          .select("seller_id, buyer_id, subtotal, listing_id, listings(title)")
          .eq("id", orderId)
          .single();

        if (order) {
          const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }] = await Promise.all([
            supabase.from("profiles").select("username, display_name").eq("id", order.seller_id).single(),
            supabase.auth.admin.getUserById(order.seller_id),
            supabase.from("profiles").select("username").eq("id", order.buyer_id).single(),
          ]);

          const sellerEmail = (sellerAuth as any).data?.user?.email;
          const listingTitle = (order.listings as any)?.title ?? "Your listing";

          if (sellerEmail) {
            await sendEmail({
              to: sellerEmail,
              subject: `You've made a sale — ${listingTitle}`,
              html: newOrderEmail({
                sellerName: sellerProfile?.display_name ?? sellerProfile?.username ?? "there",
                buyerName: buyerProfile?.username ?? "A buyer",
                listingTitle,
                amount: formatAUD(order.subtotal),
                orderId,
              }),
            });
          }
        }
      } catch {
        // Email failure should not affect order processing
      }
    }
  }

  return NextResponse.json({ received: true });
}
