/**
 * GET  /api/saved-searches  — list user's saved searches
 * POST /api/saved-searches  — create a saved search
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { savedSearchMatchEmail } from "@/lib/emails";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await (supabase as any)
    .from("saved_searches")
    .select("id, name, query, category, subcategory, condition, min_price, max_price, created_at, last_notified_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ saved_searches: data ?? [] });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { name, query, category, subcategory, condition, min_price, max_price } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("saved_searches")
    .insert({
      user_id: user.id,
      name: name.trim(),
      query: query || null,
      category: category || null,
      subcategory: subcategory?.length ? subcategory : null,
      condition: condition?.length ? condition : null,
      min_price: min_price ?? null,
      max_price: max_price ?? null,
      last_notified_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check for existing matching listings using full-text search (same as search bar + cron)
  let existingCount = 0;
  let existingMatches: { id: string; title: string; price: number }[] = [];
  if (query) {
    let q = (supabase as any)
      .from("listings")
      .select("id, title, price")
      .eq("status", "active")
      .textSearch("search_vector", query.trim(), { type: "websearch" });

    if (category) q = q.eq("category", category);
    const { data: matches } = await q.limit(5);
    existingMatches = matches ?? [];
    existingCount = existingMatches.length;
  }

  // Send immediate in-app notification + email if existing listings match
  if (existingCount > 0) {
    const admin = createAdminClient();
    const searchUrl = `/listings${query ? `?q=${encodeURIComponent(query)}` : category ? `?category=${category}` : ""}`;
    const listingWord = existingCount === 1 ? "listing" : "listings";

    await admin.from("notifications").insert({
      user_id: user.id,
      type: "saved_search_match",
      title: `${existingCount} ${listingWord} already match "${name.trim()}"`,
      body: existingCount === 1
        ? `"${existingMatches[0].title}" is already listed.`
        : `${existingCount} listings already match your watchlist item.`,
      link: searchUrl,
    });

    try {
      const { data: { user: authUser } } = await admin.auth.admin.getUserById(user.id);
      if (authUser?.email) {
        await sendEmail({
          to: authUser.email,
          subject: `${existingCount} ${listingWord} already match "${name.trim()}" on The Tack Room`,
          html: savedSearchMatchEmail({
            watchName: name.trim(),
            matches: existingMatches.map((m) => ({ id: m.id, title: m.title, price: m.price })),
            searchUrl,
          }),
        });
      }
    } catch (emailErr: any) {
      console.error("Watchlist existing-match email failed:", emailErr.message);
    }
  }

  const searchUrl = `/listings${query ? `?q=${encodeURIComponent(query)}` : category ? `?category=${category}` : ""}`;
  return NextResponse.json({ id: data.id, existingCount, searchUrl });
}
