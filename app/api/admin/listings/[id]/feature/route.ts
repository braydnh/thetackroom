/**
 * POST   /api/admin/listings/[id]/feature  — manually feature a listing (free, admin only)
 * DELETE /api/admin/listings/[id]/feature  — remove an active feature
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as any).role !== "admin") return null;
  return user;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { slot, duration_days } = await req.json() as {
    slot: "homepage" | "search_top";
    duration_days: 7 | 14 | 30;
  };

  if (!slot || !duration_days) {
    return NextResponse.json({ error: "slot and duration_days required" }, { status: 400 });
  }

  const ends_at = new Date(Date.now() + duration_days * 24 * 60 * 60 * 1000).toISOString();

  const admin = createAdminClient();

  // Look up the listing's seller_id (required by featured_listings schema)
  const { data: listing } = await admin
    .from("listings")
    .select("seller_id")
    .eq("id", listingId)
    .single();

  if (!listing) return NextResponse.json({ error: "Listing not found" }, { status: 404 });

  const { data, error } = await admin
    .from("featured_listings")
    .insert({ listing_id: listingId, seller_id: listing.seller_id, slot, ends_at, amount_paid: 0 })
    .select("id, slot, ends_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ featured: data });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await params;

  const user = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("featured_listings")
    .delete()
    .eq("listing_id", listingId)
    .gt("ends_at", new Date().toISOString());

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
