/**
 * GET /api/orders/[id]
 *
 * Returns order detail for the authenticated user (buyer or seller only).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(`
      id,
      status,
      subtotal,
      shipping_amount,
      platform_commission_pct,
      pickup_method,
      tracking_number,
      shipping_carrier,
      tracking_deadline,
      dispute_window_ends_at,
      created_at,
      buyer_id,
      seller_id,
      listing_id,
      shipping_name,
      shipping_address_line1,
      shipping_address_line2,
      shipping_city,
      shipping_state,
      shipping_postcode
    `)
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Admins can view any order; otherwise only buyer or seller
  const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (callerProfile as any)?.role === "admin";

  if (!isAdmin && order.buyer_id !== user.id && order.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isSeller = isAdmin ? true : order.seller_id === user.id;
  const otherPartyId = isSeller ? order.buyer_id : order.seller_id;

  // Fetch listing info, other party username, and whether buyer has already reviewed
  const [{ data: rawListingData }, { data: otherProfile }, { data: existingReview }] = await Promise.all([
    admin
      .from("listings")
      .select("id, title, condition, brand, listing_images(display_url, is_primary, sort_order)")
      .eq("id", order.listing_id)
      .single(),
    admin
      .from("profiles")
      .select("username")
      .eq("id", otherPartyId)
      .single(),
    admin
      .from("reviews")
      .select("id")
      .eq("order_id", id)
      .eq("reviewer_id", user.id)
      .maybeSingle(),
  ]);

  const raw = rawListingData as any;
  const images = (raw?.listing_images ?? []) as { display_url: string; is_primary: boolean; sort_order: number }[];
  const primaryImage =
    images.find((i) => i.is_primary)?.display_url ??
    images.sort((a, b) => a.sort_order - b.sort_order)[0]?.display_url ??
    null;

  return NextResponse.json({
    id: order.id,
    status: order.status,
    subtotal: order.subtotal,
    shipping_amount: order.shipping_amount,
    platform_commission_pct: order.platform_commission_pct,
    pickup_method: order.pickup_method,
    tracking_number: order.tracking_number,
    shipping_carrier: order.shipping_carrier,
    tracking_deadline: order.tracking_deadline,
    dispute_window_ends_at: order.dispute_window_ends_at,
    created_at: order.created_at,
    is_seller: isSeller,
    listing: {
      id: raw?.id ?? order.listing_id,
      title: raw?.title ?? "Listing",
      primary_image: primaryImage,
      condition: raw?.condition ?? "",
      brand: raw?.brand ?? null,
    },
    other_party_id: otherPartyId,
    other_party_username: otherProfile?.username ?? "user",
    has_reviewed: !!existingReview,
    shipping_name: order.shipping_name ?? null,
    shipping_address_line1: order.shipping_address_line1 ?? null,
    shipping_address_line2: order.shipping_address_line2 ?? null,
    shipping_city: order.shipping_city ?? null,
    shipping_state: order.shipping_state ?? null,
    shipping_postcode: order.shipping_postcode ?? null,
  });
}
