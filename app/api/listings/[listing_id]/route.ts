/**
 * GET /api/listings/[listing_id]
 *
 * Public endpoint — returns listing data needed by the checkout page.
 * Only returns active listings (and reserved, so order confirmation still shows data).
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ listing_id: string }> }
) {
  const { listing_id } = await params;

  const admin = createAdminClient();

  const { data: rawListing } = await admin
    .from("listings")
    .select(`
      id,
      title,
      price,
      shipping_price,
      allows_shipping,
      allows_pickup,
      condition,
      brand,
      status,
      listing_images(display_url, is_primary, sort_order),
      profiles!seller_id(username, location)
    `)
    .eq("id", listing_id)
    .in("status", ["active", "reserved"])
    .single();

  if (!rawListing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const raw = rawListing as any;
  const images = (raw.listing_images ?? []) as { display_url: string; is_primary: boolean; sort_order: number }[];
  const primaryImage =
    images.find((i) => i.is_primary)?.display_url ??
    images.sort((a, b) => a.sort_order - b.sort_order)[0]?.display_url ??
    null;

  const profile = Array.isArray(raw.profiles) ? raw.profiles[0] : raw.profiles;

  return NextResponse.json({
    id: raw.id,
    title: raw.title,
    price: raw.price,
    shipping_price: raw.shipping_price,
    allows_shipping: raw.allows_shipping,
    allows_pickup: raw.allows_pickup,
    condition: raw.condition,
    brand: raw.brand,
    status: raw.status,
    primary_image: primaryImage,
    seller_username: profile?.username ?? "seller",
    seller_location: profile?.location ?? null,
  });
}
