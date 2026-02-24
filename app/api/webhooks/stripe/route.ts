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
      await supabase
        .from("orders")
        .update({
          status: "payment_captured",
          stripe_payment_intent_id: pi.id,
          stripe_charge_id: pi.latest_charge as string | null,
        })
        .eq("id", pi.metadata.order_id);

      // Mark listing as reserved
      if (pi.metadata.listing_id) {
        await supabase
          .from("listings")
          .update({ status: "reserved" })
          .eq("id", pi.metadata.listing_id);
      }
    }
  }

  return NextResponse.json({ received: true });
}
