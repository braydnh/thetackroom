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
import { sendEmail } from "@/lib/resend";
import { itemShippedBuyerEmail } from "@/lib/emails";

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
    .select("id, seller_id, buyer_id, status, pickup_method, listing_id, listings(title)")
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

  // Email buyer + in-app notification (non-blocking)
  try {
    const listingTitle = (order as any).listings?.title ?? "Your item";
    const [{ data: buyerProfile }, buyerAuth] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
    ]);
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";

    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Your item has been shipped — ${listingTitle}`,
        html: itemShippedBuyerEmail({
          buyerName,
          listingTitle,
          trackingNumber: tracking_number.trim(),
          carrier: carrier ?? "other",
          orderId: id,
        }),
      });
    }

    await admin.from("notifications").insert({
      user_id: (order as any).buyer_id,
      type: "item_shipped",
      title: "Your item has been shipped!",
      body: `${listingTitle} is on its way — tracking: ${tracking_number.trim()}`,
      link: `/orders/${id}`,
    });
  } catch (err) {
    console.error("Tracking email/notification failed:", err);
  }

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
