/**
 * GET  /api/saved-searches  — list user's saved searches
 * POST /api/saved-searches  — create a saved search
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
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

  const { data, error } = await supabase
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
  return NextResponse.json({ id: data.id });
}
