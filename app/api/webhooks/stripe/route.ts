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
import { newOrderEmail, orderConfirmedBuyerEmail, stripeOnboardingCompleteEmail, boostPurchasedEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event | null = null;
  const secrets = [
    process.env.STRIPE_WEBHOOK_SECRET,
    process.env.STRIPE_CONNECT_WEBHOOK_SECRET,
  ].filter(Boolean) as string[];

  for (const secret of secrets) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, secret);
      break;
    } catch {
      // try next secret
    }
  }

  if (!event) {
    return NextResponse.json({ error: "Webhook verification failed" }, { status: 400 });
  }

  const supabase = createAdminClient();

  // ── Stripe Connect account approved ──
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    if (account.charges_enabled && account.payouts_enabled) {
      // Check current state so we only email on the first transition
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id, stripe_onboarding_complete, display_name, username")
        .eq("stripe_account_id", account.id)
        .single();

      await supabase
        .from("profiles")
        .update({ stripe_onboarding_complete: true, role: "seller" })
        .eq("stripe_account_id", account.id);

      if (existingProfile && !existingProfile.stripe_onboarding_complete) {
        try {
          const sellerAuth = await supabase.auth.admin.getUserById((existingProfile as any).id);
          const sellerEmail = (sellerAuth as any).data?.user?.email;
          const sellerName = (existingProfile as any).display_name ?? (existingProfile as any).username ?? "there";
          if (sellerEmail) {
            await sendEmail({
              to: sellerEmail,
              subject: "You're ready to start selling on The Tack Room!",
              html: stripeOnboardingCompleteEmail(sellerName),
            });
          }
        } catch (err) {
          console.error("Onboarding email failed:", err);
        }
      }
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

          // Send boost confirmation email
          try {
            const [{ data: sellerProfile }, sellerAuth, { data: listing }] = await Promise.all([
              supabase.from("profiles").select("display_name, username").eq("id", seller_id).single(),
              supabase.auth.admin.getUserById(seller_id),
              supabase.from("listings").select("title").eq("id", listing_id).single(),
            ]);
            const sellerEmail = (sellerAuth as any).data?.user?.email;
            const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
            const listingTitle = (listing as any)?.title ?? "your listing";
            const formattedEndsAt = new Date(ends_at).toLocaleString("en-AU", {
              timeZone: "Australia/Sydney",
              dateStyle: "medium",
              timeStyle: "short",
            });
            if (sellerEmail) {
              await sendEmail({
                to: sellerEmail,
                subject: `Your listing boost is live — ${listingTitle}`,
                html: boostPurchasedEmail({ sellerName, listingTitle, slot, endsAt: formattedEndsAt, listingId: listing_id }),
              });
            }
          } catch (err) {
            console.error("Boost email failed:", err);
          }
        }
      }
    }

    // ── Order payment captured ──
    if (pi.metadata.type === "order_payment" && pi.metadata.order_id) {
      const orderId = pi.metadata.order_id;

      // Idempotency: only process if still pending_payment
      const { data: currentOrder } = await supabase
        .from("orders")
        .select("status, seller_id, buyer_id, subtotal, pickup_method, listing_id, listings(title)")
        .eq("id", orderId)
        .single();

      if (currentOrder?.status !== "pending_payment") {
        return NextResponse.json({ received: true });
      }

      // Shipping orders go straight to awaiting_shipment; local pickup stays at payment_captured
      const newStatus = currentOrder.pickup_method === "shipping" ? "awaiting_shipment" : "payment_captured";

      await supabase
        .from("orders")
        .update({
          status: newStatus,
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

      // Fetch profiles + emails for both parties
      try {
        const listingTitle = (currentOrder.listings as any)?.title ?? "Your listing";
        const totalAmount = formatAUD(pi.amount_received);

        const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }, buyerAuth] = await Promise.all([
          supabase.from("profiles").select("username, display_name").eq("id", currentOrder.seller_id).single(),
          supabase.auth.admin.getUserById(currentOrder.seller_id),
          supabase.from("profiles").select("username, display_name").eq("id", currentOrder.buyer_id).single(),
          supabase.auth.admin.getUserById(currentOrder.buyer_id),
        ]);

        const sellerEmail = (sellerAuth as any).data?.user?.email;
        const buyerEmail = (buyerAuth as any).data?.user?.email;
        const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
        const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "A buyer";

        // Email seller
        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: `You've made a sale — ${listingTitle}`,
            html: newOrderEmail({
              sellerName,
              buyerName,
              listingTitle,
              amount: formatAUD(currentOrder.subtotal),
              orderId,
            }),
          });
        }

        // Email buyer
        if (buyerEmail) {
          await sendEmail({
            to: buyerEmail,
            subject: `Order confirmed — ${listingTitle}`,
            html: orderConfirmedBuyerEmail({
              buyerName,
              listingTitle,
              sellerName,
              amount: totalAmount,
              orderId,
              pickupMethod: currentOrder.pickup_method as "shipping" | "local_pickup",
            }),
          });
        }

        // In-app notification for seller
        await supabase.from("notifications").insert({
          user_id: currentOrder.seller_id,
          type: "new_sale",
          title: "You've made a sale!",
          body: `${buyerName} purchased "${listingTitle}"`,
          link: `/orders/${orderId}`,
        });

        // In-app notification for buyer
        await supabase.from("notifications").insert({
          user_id: currentOrder.buyer_id,
          type: "order_confirmed",
          title: "Order confirmed",
          body: `Your purchase of "${listingTitle}" is confirmed.`,
          link: `/orders/${orderId}`,
        });
      } catch {
        // Notifications/email failure should not affect order processing
      }
    }
  }

  return NextResponse.json({ received: true });
}
