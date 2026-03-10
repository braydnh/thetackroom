/**
 * GET /api/listings/[listing_id]/images
 *
 * Lightweight endpoint — returns sorted image URLs for a listing card carousel.
 * Called lazily client-side on first hover/touch so the grid page doesn't
 * need to join listing_images upfront.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listing_id: string }> }
) {
  const { listing_id } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("listing_images")
    .select("display_url, sort_order")
    .eq("listing_id", listing_id)
    .order("sort_order");

  return NextResponse.json(
    { images: (data ?? []).map((r: any) => r.display_url as string) },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=60" } }
  );
}
