/**
 * POST /api/admin/orders/[id]/mark-delivered
 * Admin action to manually advance a shipped order to dispute_window.
 * Used for orders where 17track delivery webhook was missed.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { itemDeliveredSellerEmail, itemDeliveredBuyerEmail } from "@/lib/emails";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerProfile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if ((callerProfile as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: order } = await admin
    .from("orders")
    .select("id, status, seller_id, buyer_id, listing_id, listings(title)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).status !== "shipped") {
    return NextResponse.json({ error: `Order is ${(order as any).status}, not shipped` }, { status: 400 });
  }

  const disputeWindowEndsAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

  await admin
    .from("orders")
    .update({ status: "dispute_window", dispute_window_ends_at: disputeWindowEndsAt })
    .eq("id", orderId);

  try {
    const listingTitle = ((order as any).listings as any)?.title ?? "Your item";
    const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }, buyerAuth] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
      admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
    ]);

    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";
    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const buyerEmail = (buyerAuth as any).data?.user?.email;

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `Your item has been delivered — ${listingTitle}`,
        html: itemDeliveredSellerEmail({ sellerName, listingTitle, orderId }),
      });
    }
    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Your item has been delivered — ${listingTitle}`,
        html: itemDeliveredBuyerEmail({ buyerName, listingTitle, disputeWindowEndsAt, orderId }),
      });
    }

    await admin.from("notifications").insert([
      {
        user_id: (order as any).seller_id,
        type: "item_delivered",
        title: "Your item has been delivered!",
        body: `${listingTitle} was delivered. Your payout will be released shortly.`,
        link: `/orders/${orderId}`,
      },
      {
        user_id: (order as any).buyer_id,
        type: "dispute_window",
        title: "Your item has been delivered!",
        body: `You have 48 hours to raise a dispute for "${listingTitle}".`,
        link: `/orders/${orderId}`,
      },
    ]);
  } catch (err) {
    console.error("mark-delivered: email/notification failed:", err);
  }

  return NextResponse.json({ success: true });
}
