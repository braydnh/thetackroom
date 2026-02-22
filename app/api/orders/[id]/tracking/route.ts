/**
 * POST /api/orders/[id]/tracking
 *
 * Seller submits a tracking number for a shipped order.
 * Updates order status: awaiting_shipment → shipped
 * Phase 4 will wire this to AfterShip to create a tracking record.
 *
 * Body: { tracking_number: string; carrier: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAfterShipTracking } from "@/lib/aftership";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { tracking_number, carrier } = await req.json() as { tracking_number: string; carrier: string };
  if (!tracking_number?.trim()) {
    return NextResponse.json({ error: "Tracking number is required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify order belongs to this seller and is in the right state
  const { data: order } = await admin
    .from("orders")
    .select("id, seller_id, status, pickup_method, listing_id")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if (order.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (order.pickup_method !== "shipping") {
    return NextResponse.json({ error: "This order uses local pickup" }, { status: 400 });
  }
  if (order.status !== "awaiting_shipment") {
    return NextResponse.json({ error: "Order is not awaiting shipment" }, { status: 400 });
  }

  const { error } = await admin
    .from("orders")
    .update({
      tracking_number: tracking_number.trim(),
      shipping_carrier: carrier ?? "other",
      status: "shipped",
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch listing title for AfterShip label
  const { data: listing } = await admin
    .from("listings")
    .select("title")
    .eq("id", order.listing_id)
    .single();

  // Create AfterShip tracking record (non-blocking — save tracking ID if created)
  try {
    const aftership = await createAfterShipTracking({
      trackingNumber: tracking_number.trim(),
      carrier: carrier ?? "other",
      orderId: id,
      title: (listing as any)?.title ?? "Order",
    });
    if (aftership?.tracking_id) {
      await admin
        .from("orders")
        .update({ aftership_tracking_id: aftership.tracking_id })
        .eq("id", id);
    }
  } catch (err) {
    // Non-fatal — order is already marked shipped
    console.error("AfterShip tracking creation failed:", err);
  }

  return NextResponse.json({ success: true });
}
