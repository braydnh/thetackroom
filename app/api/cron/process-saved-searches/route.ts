/**
 * GET /api/cron/process-saved-searches
 *
 * Vercel Cron — runs hourly (0 * * * *).
 * Checks all saved searches (Want to Buy watchlist) for new matching listings
 * posted since last check, then sends in-app + email notifications.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { savedSearchMatchEmail, itemDeliveredSellerEmail, itemDeliveredBuyerEmail } from "@/lib/emails";
import { poll17TrackStatus } from "@/lib/17track";

export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = new Date().toISOString();
  const results: { id: string; status: string; detail?: string }[] = [];

  // Fetch all saved searches ordered by oldest check first
  const { data: savedSearches } = await (admin as any)
    .from("saved_searches")
    .select("id, user_id, name, query, category, subcategory, condition, min_price, max_price, last_notified_at")
    .not("last_notified_at", "is", null)
    .order("last_notified_at", { ascending: true })
    .limit(100);

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

      // Always advance last_notified_at so we don't re-check old listings next run
      await (admin as any)
        .from("saved_searches")
        .update({ last_notified_at: now })
        .eq("id", search.id);

      if (!matches || matches.length === 0) continue;

      const searchUrl = `/listings${search.query ? `?q=${encodeURIComponent(search.query)}` : search.category ? `?category=${search.category}` : ""}`;
      const listingWord = matches.length === 1 ? "listing" : "listings";

      // In-app notification
      await admin.from("notifications").insert({
        user_id: search.user_id,
        type: "saved_search_match",
        title: `New ${listingWord} match "${search.name}"`,
        body: matches.length === 1
          ? `"${matches[0].title}" was just listed.`
          : `${matches.length} new ${listingWord} match your watchlist.`,
        link: searchUrl,
      });

      // Email notification
      try {
        const { data: { user: authUser } } = await admin.auth.admin.getUserById(search.user_id);
        if (authUser?.email) {
          await sendEmail({
            to: authUser.email,
            subject: `New ${listingWord} match "${search.name}" on The Tack Room`,
            html: savedSearchMatchEmail({
              watchName: search.name,
              matches: matches.map((m: any) => ({ id: m.id, title: m.title, price: m.price })),
              searchUrl,
            }),
          });
        }
      } catch (emailErr: any) {
        console.error(`Email failed for saved search ${search.id}:`, emailErr.message);
      }

      results.push({ id: search.id, status: "ok", detail: `${matches.length} matches` });
    } catch (err: any) {
      console.error(`Saved search ${search.id} failed:`, err.message);
      results.push({ id: search.id, status: "error", detail: err.message });
    }
  }

  // ── Hourly delivery poll: check 17track for shipped orders awaiting webhook ──
  const H = 60 * 60 * 1000;
  const nowMs = Date.now();
  const { data: shippedOrders } = await admin
    .from("orders")
    .select("id, seller_id, buyer_id, tracking_number, listing_id, listings(title)")
    .eq("status", "shipped")
    .eq("pickup_method", "shipping")
    .not("tracking_number", "is", null)
    .limit(40);

  if (shippedOrders && shippedOrders.length > 0) {
    const trackingNumbers = (shippedOrders as any[]).map((o) => o.tracking_number as string);
    const statusMap = await poll17TrackStatus(trackingNumbers);

    for (const order of shippedOrders as any[]) {
      const tag = statusMap.get(order.tracking_number);
      if (tag !== "Delivered") continue;

      const disputeWindowEndsAt = new Date(nowMs + 48 * H).toISOString();

      try {
        await admin
          .from("orders")
          .update({ status: "dispute_window", dispute_window_ends_at: disputeWindowEndsAt })
          .eq("id", order.id);

        console.log(`Order ${order.id} → dispute_window via hourly delivery poll.`);

        const listingTitle = (order.listings as any)?.title ?? "Your item";

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

        results.push({ id: order.id, status: "ok", detail: "delivery_poll" });
      } catch (err: any) {
        console.error(`Hourly delivery poll failed for order ${order.id}:`, err.message);
        results.push({ id: order.id, status: "error", detail: `delivery_poll: ${err.message}` });
      }
    }
  }

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: now,
  });
}
