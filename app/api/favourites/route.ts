/**
 * POST /api/favourites
 *
 * Toggles a listing favourite for the current user.
 * Body: { listing_id: string }
 * Returns: { favourited: boolean }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listing_id } = await req.json() as { listing_id: string };
  if (!listing_id) return NextResponse.json({ error: "listing_id is required" }, { status: 400 });

  // Check if already favourited
  const { data: existing } = await supabase
    .from("favourites")
    .select("id")
    .eq("user_id", user.id)
    .eq("listing_id", listing_id)
    .maybeSingle();

  if (existing) {
    // Remove favourite
    await supabase
      .from("favourites")
      .delete()
      .eq("user_id", user.id)
      .eq("listing_id", listing_id);
    return NextResponse.json({ favourited: false });
  } else {
    // Add favourite
    const { error } = await supabase
      .from("favourites")
      .insert({ user_id: user.id, listing_id });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ favourited: true });
  }
}
