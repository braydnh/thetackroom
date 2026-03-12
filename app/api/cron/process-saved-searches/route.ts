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
import { savedSearchMatchEmail } from "@/lib/emails";

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

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: now,
  });
}
