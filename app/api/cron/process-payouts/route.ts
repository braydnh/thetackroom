/**
 * GET /api/cron/process-payouts
 *
 * Vercel Cron job — runs daily at midnight (0 0 * * *).
 * Handles three things in one pass:
 *
 * 1. PAYOUTS: orders with status "delivered" or "dispute_window" where dispute_window_ends_at <= NOW()
 *    → creates Stripe Transfer to seller, marks order "completed"
 *
 * 2. TRACKING REMINDERS: awaiting_shipment shipping orders where tracking_deadline is approaching
 *    → 6h reminder: deadline within next 24h, reminder_6h_sent = false
 *    → 2h reminder: deadline within next 6h, reminder_2h_sent = false
 *
 * 3. OVERDUE TRACKING: awaiting_shipment shipping orders where tracking_deadline has passed
 *    → marks order "disputed", restores listing to "active", notifies both parties
 *
 * Secured with CRON_SECRET — Vercel passes it as Authorization: Bearer <secret>
 */

import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import {
  payoutReleasedSellerEmail,
  leaveReviewBuyerEmail,
  trackingDeadlineExpiredSellerEmail,
  trackingDeadlineExpiredBuyerEmail,
  payoutFailedSellerEmail,
  trackingReminderEmail,
  itemDeliveredSellerEmail,
  itemDeliveredBuyerEmail,
} from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";
import { poll17TrackStatus } from "@/lib/17track";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function GET(req: Request) {
  // Verify cron secret — always required; missing secret is a misconfiguration
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
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

      // Notify seller their payout failed
      try {
        const listingTitle = (order as any).listings?.title ?? "your item";
        const [{ data: sellerProfile }, sellerAuth] = await Promise.all([
          admin.from("profiles").select("display_name, username").eq("id", order.seller_id).single(),
          admin.auth.admin.getUserById(order.seller_id),
        ]);
        const sellerEmail = (sellerAuth as any).data?.user?.email;
        const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: `Action needed: your payout could not be processed — ${listingTitle}`,
            html: payoutFailedSellerEmail({ sellerName, listingTitle, orderId: order.id }),
          });
        }
      } catch {
        // best-effort
      }
    }
  }

  // ── Tracking reminders (folded in here since Hobby plan only allows daily crons) ──
  // 6h reminder: deadline within next 24h (catches everything due today from midnight run)
  // 2h reminder: deadline within next 6h (more urgent, red banner)
  const H = 60 * 60 * 1000;
  const nowMs = Date.now();
  const in24h = new Date(nowMs + 24 * H).toISOString();
  const in6h  = new Date(nowMs +  6 * H).toISOString();

  const [{ data: reminder6hOrders }, { data: reminder2hOrders }] = await Promise.all([
    admin
      .from("orders")
      .select("id, seller_id, tracking_deadline, listings(title)")
      .eq("status", "awaiting_shipment")
      .eq("pickup_method", "shipping")
      .eq("reminder_6h_sent", false)
      .gt("tracking_deadline", now)
      .lte("tracking_deadline", in24h)
      .limit(50),
    admin
      .from("orders")
      .select("id, seller_id, tracking_deadline, listings(title)")
      .eq("status", "awaiting_shipment")
      .eq("pickup_method", "shipping")
      .eq("reminder_2h_sent", false)
      .gt("tracking_deadline", now)
      .lte("tracking_deadline", in6h)
      .limit(50),
  ]);

  async function sendTrackingReminder(order: any, type: "6h" | "2h") {
    const flagField = type === "6h" ? "reminder_6h_sent" : "reminder_2h_sent";
    const hoursLeft = Math.max(1, Math.round((new Date(order.tracking_deadline).getTime() - nowMs) / H));
    try {
      const [{ data: profile }, authResult] = await Promise.all([
        admin.from("profiles").select("display_name, username").eq("id", order.seller_id).single(),
        admin.auth.admin.getUserById(order.seller_id),
      ]);
      const sellerEmail = (authResult as any).data?.user?.email;
      if (!sellerEmail) throw new Error("No seller email");
      const sellerName = profile?.display_name ?? profile?.username ?? "there";
      const listingTitle = (order as any).listings?.title ?? "your item";
      const deadline = new Date(order.tracking_deadline).toLocaleString("en-AU", {
        timeZone: "Australia/Sydney",
        dateStyle: "medium",
        timeStyle: "short",
      });
      await sendEmail({
        to: sellerEmail,
        subject: type === "6h"
          ? `Reminder: add tracking for "${listingTitle}" — deadline today`
          : `Final reminder: tracking deadline approaching — "${listingTitle}"`,
        html: trackingReminderEmail({ sellerName, listingTitle, orderId: order.id, hoursLeft, deadline }),
      });
      await admin.from("orders").update({ [flagField]: true }).eq("id", order.id);
      results.push({ order_id: order.id, status: "ok", detail: `tracking_reminder_${type}` });
    } catch (err: any) {
      console.error(`Tracking reminder ${type} failed for order ${order.id}:`, err.message);
      results.push({ order_id: order.id, status: "error", detail: `tracking_reminder_${type}: ${err.message}` });
    }
  }

  await Promise.all([
    ...(reminder6hOrders ?? []).map((o: any) => sendTrackingReminder(o, "6h")),
    ...(reminder2hOrders ?? []).map((o: any) => sendTrackingReminder(o, "2h")),
  ]);

  // Also handle: tracking deadline expired without tracking submission → offer refund
  const trackingDeadline = new Date().toISOString();
  const { data: overdueOrders } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, listing_id, listings(title)")
    .eq("status", "awaiting_shipment")
    .eq("pickup_method", "shipping")
    .lt("tracking_deadline", trackingDeadline)
    .limit(20);

  for (const order of (overdueOrders ?? [])) {
    try {
      await admin.from("orders").update({
        status: "disputed",
        seller_notes: "tracking_deadline_exceeded",
      }).eq("id", order.id);

      await admin.from("listings").update({ status: "active" }).eq("id", order.listing_id);

      // Notify both parties
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

        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: `Shipping deadline missed — ${listingTitle}`,
            html: trackingDeadlineExpiredSellerEmail({ sellerName, listingTitle, orderId: order.id }),
          });
        }
        if (buyerEmail) {
          await sendEmail({
            to: buyerEmail,
            subject: `Shipping deadline missed — ${listingTitle}`,
            html: trackingDeadlineExpiredBuyerEmail({ buyerName, listingTitle, orderId: order.id }),
          });
        }

        await Promise.all([
          admin.from("notifications").insert({
            user_id: (order as any).seller_id,
            type: "tracking_deadline_expired",
            title: "Shipping deadline missed",
            body: `You missed the shipping deadline for "${listingTitle}". The buyer has been offered a refund.`,
            link: `/orders/${order.id}`,
          }),
          admin.from("notifications").insert({
            user_id: (order as any).buyer_id,
            type: "tracking_deadline_expired",
            title: "Seller missed shipping deadline",
            body: `The seller missed the shipping deadline for "${listingTitle}". You are eligible for a full refund.`,
            link: `/orders/${order.id}`,
          }),
        ]);
      } catch (notifyErr) {
        console.error(`Deadline notifications failed for order ${order.id}:`, notifyErr);
      }

      results.push({ order_id: order.id, status: "ok", detail: "tracking_deadline_expired" });
    } catch (err: any) {
      results.push({ order_id: order.id, status: "error", detail: err.message });
    }
  }

  // ── Abandoned cart cleanup: cancel pending_payment orders older than 24 hours ──
  const cutoff24h = new Date(nowMs - 24 * H).toISOString();
  const { data: abandonedOrders } = await admin
    .from("orders")
    .select("id, listing_id, stripe_payment_intent_id")
    .eq("status", "pending_payment")
    .lt("created_at", cutoff24h)
    .limit(50);

  for (const order of (abandonedOrders ?? [])) {
    try {
      // Void the PaymentIntent in Stripe so it can't be completed later
      if ((order as any).stripe_payment_intent_id) {
        try {
          await stripe.paymentIntents.cancel((order as any).stripe_payment_intent_id);
        } catch {
          // Already cancelled/succeeded — ignore
        }
      }
      await admin.from("orders").update({ status: "cancelled" }).eq("id", order.id);
      results.push({ order_id: order.id, status: "ok", detail: "abandoned_cart_cancelled" });
    } catch (err: any) {
      results.push({ order_id: order.id, status: "error", detail: `abandoned_cart: ${err.message}` });
    }
  }

  // ── Delivery polling: check 17track for shipped orders that never got a webhook ──
  // Also catches orders shipped > 21 days ago as a time-based fallback.
  const shippedCutoff21d = new Date(nowMs - 21 * 24 * H).toISOString();
  const { data: shippedOrders } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, tracking_number, created_at, listing_id, listings(title)")
    .eq("status", "shipped")
    .eq("pickup_method", "shipping")
    .not("tracking_number", "is", null)
    .limit(40);

  if (shippedOrders && shippedOrders.length > 0) {
    // Poll 17track for all shipped orders in one call
    const trackingNumbers = (shippedOrders as any[]).map((o) => o.tracking_number as string);
    const statusMap = await poll17TrackStatus(trackingNumbers);

    for (const order of shippedOrders as any[]) {
      const tag = statusMap.get(order.tracking_number);
      const isDelivered = tag === "Delivered";
      const isOverdue = order.created_at && new Date(order.created_at) < new Date(shippedCutoff21d);

      if (!isDelivered && !isOverdue) continue;

      const disputeWindowEndsAt = new Date(nowMs + 48 * H).toISOString();

      try {
        await admin
          .from("orders")
          .update({ status: "dispute_window", dispute_window_ends_at: disputeWindowEndsAt })
          .eq("id", order.id);

        const listingTitle = (order.listings as any)?.title ?? "Your item";
        const detail = isDelivered ? "delivery_poll" : "overdue_21d_fallback";
        console.log(`Order ${order.id} → dispute_window via ${detail}. Tracking tag: ${tag ?? "n/a"}`);

        const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }, buyerAuth] = await Promise.all([
          admin.from("profiles").select("display_name, username").eq("id", order.seller_id).single(),
          admin.auth.admin.getUserById(order.seller_id),
          admin.from("profiles").select("display_name, username").eq("id", order.buyer_id).single(),
          admin.auth.admin.getUserById(order.buyer_id),
        ]);

        const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
        const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";
        const sellerEmail = (sellerAuth as any).data?.user?.email;
        const buyerEmail = (buyerAuth as any).data?.user?.email;

        if (sellerEmail) {
          await sendEmail({
            to: sellerEmail,
            subject: `Your item has been delivered — ${listingTitle}`,
            html: itemDeliveredSellerEmail({ sellerName, listingTitle, orderId: order.id }),
          });
        }
        if (buyerEmail) {
          await sendEmail({
            to: buyerEmail,
            subject: `Your item has been delivered — ${listingTitle}`,
            html: itemDeliveredBuyerEmail({ buyerName, listingTitle, disputeWindowEndsAt, orderId: order.id }),
          });
        }

        await admin.from("notifications").insert([
          {
            user_id: order.seller_id,
            type: "item_delivered",
            title: "Your item has been delivered!",
            body: `${listingTitle} was delivered. Your payout will be released shortly.`,
            link: `/orders/${order.id}`,
          },
          {
            user_id: order.buyer_id,
            type: "dispute_window",
            title: "Your item has been delivered!",
            body: `You have 48 hours to raise a dispute for "${listingTitle}". After that, the seller will be paid out.`,
            link: `/orders/${order.id}`,
          },
        ]);

        results.push({ order_id: order.id, status: "ok", detail });
      } catch (err: any) {
        console.error(`Delivery poll update failed for order ${order.id}:`, err.message);
        results.push({ order_id: order.id, status: "error", detail: `delivery_poll: ${err.message}` });
      }
    }
  }

  // ── Saved search notifications ──
  // For each saved search, find listings posted since last_notified_at and notify the user
  const { data: savedSearches } = await (admin as any)
    .from("saved_searches")
    .select("id, user_id, name, query, category, subcategory, condition, min_price, max_price, last_notified_at")
    .not("last_notified_at", "is", null)
    .order("last_notified_at", { ascending: true })
    .limit(50);

  for (const search of (savedSearches ?? []) as any[]) {
    try {
      let q = admin
        .from("listings")
        .select("id, title, price")
        .eq("status", "active")
        .gt("created_at", search.last_notified_at)
        .limit(5);

      if (search.query) q = (q as any).textSearch("search_vector", search.query, { type: "websearch" });
      if (search.category) q = (q as any).eq("category", search.category);
      if (search.subcategory?.length) q = (q as any).in("subcategory", search.subcategory);
      if (search.condition?.length) q = (q as any).in("condition", search.condition);
      if (search.min_price) q = (q as any).gte("price", search.min_price);
      if (search.max_price) q = (q as any).lte("price", search.max_price);

      const { data: matches } = await (q as any);

      // Always update last_notified_at so we don't re-check old listings next run
      await (admin as any)
        .from("saved_searches")
        .update({ last_notified_at: now })
        .eq("id", search.id);

      if (!matches || matches.length === 0) continue;

      // Send in-app notification
      const listingWord = matches.length === 1 ? "listing" : "listings";
      await admin.from("notifications").insert({
        user_id: search.user_id,
        type: "saved_search_match",
        title: `New ${listingWord} match "${search.name}"`,
        body: matches.length === 1
          ? `"${matches[0].title}" was just listed.`
          : `${matches.length} new ${listingWord} match your saved search.`,
        link: `/listings${search.query ? `?q=${encodeURIComponent(search.query)}` : search.category ? `?category=${search.category}` : ""}`,
      });

      results.push({ order_id: `saved_search:${search.id}`, status: "ok", detail: `${matches.length} matches` });
    } catch (err: any) {
      console.error(`Saved search ${search.id} notification failed:`, err.message);
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
