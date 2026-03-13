/**
 * POST /api/stripe/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for a listing purchase.
 * Uses "separate charges and transfers" model — platform captures the full amount,
 * and releases to the seller's connected account only after delivery is confirmed.
 *
 * Body: { listing_id, pickup_method: "shipping" | "local_pickup" }
 * Returns: { client_secret, order_id, amount }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";
import { calculateSellerPayout } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(req: Request) {
  try {
    const { listing_id, pickup_method = "shipping", shipping_address, coupon_code } = await req.json() as {
      listing_id: string;
      pickup_method?: "shipping" | "local_pickup";
      shipping_address?: {
        name: string;
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postcode: string;
      };
      coupon_code?: string;
    };

    if (!listing_id) {
      return NextResponse.json({ error: "Missing listing_id" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Fetch the listing + seller profile
    const { data: rawListing } = await admin
      .from("listings")
      .select("id, title, price, status, seller_id, allows_shipping, allows_pickup, shipping_price, profiles!seller_id(stripe_account_id, stripe_onboarding_complete)")
      .eq("id", listing_id)
      .eq("status", "active")
      .single();

    if (!rawListing) {
      return NextResponse.json({ error: "Listing not found or no longer available" }, { status: 404 });
    }

    const listing = rawListing as any;

    // Can't buy your own listing
    if (listing.seller_id === user.id) {
      return NextResponse.json({ error: "You can't purchase your own listing" }, { status: 400 });
    }

    const seller = Array.isArray(listing.profiles)
      ? listing.profiles[0]
      : listing.profiles;

    if (!seller?.stripe_onboarding_complete || !seller?.stripe_account_id) {
      return NextResponse.json({ error: "Seller has not set up payments yet" }, { status: 400 });
    }

    // Determine shipping amount
    const shippingAmount = pickup_method === "shipping" && listing.allows_shipping
      ? listing.shipping_price
      : 0;
    const subtotal = listing.price;

    // Validate coupon server-side if provided
    let discountAmount = 0;
    let validatedCouponCode: string | null = null;
    if (coupon_code?.trim()) {
      const { data: coupon } = await admin
        .from("coupon_codes")
        .select("id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
        .filter("upper(code)", "eq", coupon_code.trim().toUpperCase())
        .maybeSingle();

      if (coupon && coupon.is_active &&
          (!coupon.expires_at || new Date(coupon.expires_at) >= new Date()) &&
          (coupon.max_uses === null || coupon.uses_count < coupon.max_uses)) {
        if (coupon.discount_type === "percentage") {
          discountAmount = Math.floor(subtotal * Number(coupon.discount_value) / 100);
        } else {
          discountAmount = Math.floor(Number(coupon.discount_value) * 100);
        }
        discountAmount = Math.min(discountAmount, subtotal);
        validatedCouponCode = coupon.code;
      }
    }

    const totalAmount = Math.max(subtotal + shippingAmount - discountAmount, 50); // Stripe minimum 50 cents

    // Fetch commission config values in parallel
    const [
      { data: standardRow },
      { data: ambassadorRow },
      { data: adminRow },
    ] = await Promise.all([
      admin.from("platform_config").select("value").eq("key", "commission_pct").single(),
      admin.from("platform_config").select("value").eq("key", "ambassador_commission_pct").single(),
      admin.from("platform_config").select("value").eq("key", "admin_commission_pct").single(),
    ]);
    const standardCommissionPct  = parseFloat(standardRow?.value   ?? "5.0");
    const ambassadorCommissionPct = parseFloat(ambassadorRow?.value ?? "2.5");
    const adminCommissionPct      = parseFloat(adminRow?.value      ?? "0.0");

    // Determine seller's commission rate based on role/status
    const { data: sellerProfileRow } = await admin
      .from("profiles")
      .select("is_ambassador, role")
      .eq("id", listing.seller_id)
      .single();

    let commissionPct: number;
    if (sellerProfileRow?.role === "admin") {
      commissionPct = adminCommissionPct;
    } else if (sellerProfileRow?.is_ambassador) {
      commissionPct = ambassadorCommissionPct;
    } else {
      commissionPct = standardCommissionPct;
    }

    const { commission, sellerPayout } = calculateSellerPayout(subtotal - discountAmount, shippingAmount, commissionPct);

    // Reuse existing pending order if one already exists (prevents duplicates on back-navigation)
    const { data: existingOrder } = await admin
      .from("orders")
      .select("id, stripe_payment_intent_id")
      .eq("listing_id", listing_id)
      .eq("buyer_id", user.id)
      .eq("status", "pending_payment")
      .eq("pickup_method", pickup_method)
      .maybeSingle();

    if (existingOrder?.stripe_payment_intent_id) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(existingOrder.stripe_payment_intent_id);
        if (["requires_payment_method", "requires_confirmation", "requires_action"].includes(existingPi.status)) {
          return NextResponse.json({
            client_secret: existingPi.client_secret,
            order_id: existingOrder.id,
            amount: existingPi.amount,
          });
        }
      } catch {
        // If PI can't be retrieved, fall through to create a new one
      }
    }

    // Create the order row first (draft state)
    const { data: order, error: orderError } = await admin
      .from("orders")
      .insert({
        listing_id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        subtotal,
        shipping_amount: shippingAmount,
        platform_commission_pct: commissionPct,
        platform_commission_amt: commission,
        seller_payout_amt: sellerPayout,
        pickup_method,
        status: "pending_payment",
        tracking_deadline: pickup_method === "shipping"
          ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
          : null,
        ...(pickup_method === "shipping" && shipping_address ? {
          shipping_name: shipping_address.name,
          shipping_address_line1: shipping_address.line1,
          shipping_address_line2: shipping_address.line2 || null,
          shipping_city: shipping_address.city,
          shipping_state: shipping_address.state,
          shipping_postcode: shipping_address.postcode,
        } : {}),
        ...(validatedCouponCode ? {
          coupon_code: validatedCouponCode,
          discount_amount: discountAmount,
        } : {}),
      })
      .select("id")
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message ?? "Failed to create order");
    }

    // Increment coupon uses_count now that the order is created
    if (validatedCouponCode) {
      await (admin.rpc as any)("increment_coupon_uses", { p_code: validatedCouponCode }).catch(() => {
        console.warn("Failed to increment coupon uses_count for", validatedCouponCode);
      });
    }

    // Create Stripe PaymentIntent — captured immediately to PLATFORM account
    const paymentIntent = await stripe.paymentIntents.create({
      amount: totalAmount,
      currency: "aud",
      automatic_payment_methods: { enabled: true },
      metadata: {
        type: "order_payment",
        order_id: order.id,
        listing_id,
        buyer_id: user.id,
        seller_id: listing.seller_id,
        seller_stripe_account: seller.stripe_account_id,
      },
      statement_descriptor_suffix: "THE TACK ROOM",
      description: `Purchase: "${listing.title}"`,
    });

    // Save the payment intent ID to the order
    await admin
      .from("orders")
      .update({ stripe_payment_intent_id: paymentIntent.id })
      .eq("id", order.id);

    return NextResponse.json({
      client_secret: paymentIntent.client_secret,
      order_id: order.id,
      amount: totalAmount,
      discount_amount: discountAmount,
    });
  } catch (err: any) {
    console.error("create-payment-intent error:", err);
    return NextResponse.json({ error: err.message ?? "Server error" }, { status: 500 });
  }
}
