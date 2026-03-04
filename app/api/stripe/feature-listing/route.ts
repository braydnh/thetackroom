/**
 * POST /api/stripe/feature-listing
 *
 * Creates a Stripe PaymentIntent for a "Boost" purchase.
 * On success the client confirms payment; the webhook creates the featured_listings row.
 *
 * Body: { listing_id, slot, duration_days }
 * Returns: { client_secret, amount_cents, ends_at }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

const PRICING: Record<string, Record<number, number>> = {
  homepage:    { 7: 1099, 14: 1899 },
  search_top:  { 7: 1099, 14: 1899 },
};

export async function POST(req: Request) {
  try {
    const { listing_id, slot, duration_days } = await req.json() as {
      listing_id: string;
      slot: "homepage" | "search_top";
      duration_days: 7 | 14;
    };

    if (!listing_id || !slot || !duration_days) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const amount = PRICING[slot]?.[duration_days];
    if (!amount) {
      return NextResponse.json({ error: "Invalid slot or duration" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify the listing belongs to this seller and is active
    const { data: listing } = await supabase
      .from("listings")
      .select("id, title, status, seller_id")
      .eq("id", listing_id)
      .eq("seller_id", user.id)
      .eq("status", "active")
      .single();

    if (!listing) {
      return NextResponse.json({ error: "Listing not found or not active" }, { status: 404 });
    }

    const ends_at = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString();

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "featured_listing",
        listing_id,
        seller_id: user.id,
        slot,
        duration_days: String(duration_days),
        ends_at,
      },
      statement_descriptor_suffix: "THE TACK ROOM",
      description: `Boost: "${listing.title}" — ${slot} for ${duration_days} days`,
    });

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      amount_cents: amount,
      ends_at,
    });
  } catch (err: any) {
    console.error("feature-listing error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
