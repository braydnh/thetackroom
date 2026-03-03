/**
 * POST /api/orders/[id]/dispute
 *
 * Allows the buyer to raise a dispute during the dispute window.
 * Sets order status to "disputed" and notifies both parties + admin.
 *
 * Body: { reason: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { disputeRaisedBuyerEmail, disputeRaisedSellerEmail } from "@/lib/emails";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { reason } = await req.json() as { reason?: string };
  if (!reason?.trim()) {
    return NextResponse.json({ error: "Please provide a reason for your dispute." }, { status: 400 });
  }
  if (reason.length > 5000) {
    return NextResponse.json({ error: "Reason must be 5000 characters or fewer." }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select("id, status, buyer_id, seller_id, dispute_window_ends_at, listing_id, listings(title)")
    .eq("id", orderId)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).buyer_id !== user.id) {
    return NextResponse.json({ error: "Only the buyer can raise a dispute." }, { status: 403 });
  }
  if ((order as any).status !== "dispute_window") {
    return NextResponse.json({ error: "This order is not in a disputable state." }, { status: 422 });
  }

  // Check window hasn't expired
  const windowEnd = (order as any).dispute_window_ends_at;
  if (windowEnd && new Date(windowEnd) < new Date()) {
    return NextResponse.json({ error: "The dispute window has closed for this order." }, { status: 422 });
  }

  await admin
    .from("orders")
    .update({ status: "disputed" })
    .eq("id", orderId);

  const listingTitle = ((order as any).listings as any)?.title ?? "the item";

  // Notify both parties
  try {
    await admin.from("notifications").insert([
      {
        user_id: (order as any).buyer_id,
        type: "dispute_raised",
        title: "Dispute raised",
        body: `Your dispute for "${listingTitle}" has been submitted. Our team will review it shortly.`,
        link: `/orders/${orderId}`,
      },
      {
        user_id: (order as any).seller_id,
        type: "dispute_raised",
        title: "A dispute has been raised",
        body: `The buyer has raised a dispute for "${listingTitle}". Our team will be in touch.`,
        link: `/orders/${orderId}`,
      },
    ]);
  } catch {
    // Non-blocking
  }

  // Email both parties
  try {
    const [{ data: buyerProfile }, buyerAuth, { data: sellerProfile }, sellerAuth] = await Promise.all([
      admin.from("profiles").select("display_name, username").eq("id", (order as any).buyer_id).single(),
      admin.auth.admin.getUserById((order as any).buyer_id),
      admin.from("profiles").select("display_name, username").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
    ]);

    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "there";
    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    const sellerEmail = (sellerAuth as any).data?.user?.email;

    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Dispute received — ${listingTitle}`,
        html: disputeRaisedBuyerEmail({ buyerName, listingTitle, reason: reason.trim(), orderId }),
      });
    }

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `Dispute raised on your order — ${listingTitle}`,
        html: disputeRaisedSellerEmail({ sellerName, listingTitle, reason: reason.trim(), orderId }),
      });
    }

    // Email all admin users
    const { data: adminProfiles } = await admin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    await Promise.all(
      (adminProfiles ?? []).map(async (adminProfile) => {
        const adminAuth = await admin.auth.admin.getUserById(adminProfile.id);
        const adminEmail = (adminAuth as any).data?.user?.email;
        if (adminEmail) {
          const esc = (s: string) =>
            s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
          await sendEmail({
            to: adminEmail,
            subject: `⚠️ Dispute raised — ${listingTitle} (Order ${orderId.slice(0, 8)})`,
            html: `<p><strong>A dispute has been raised and requires your attention.</strong></p>
<p><strong>Order:</strong> ${esc(orderId)}</p>
<p><strong>Item:</strong> ${esc(listingTitle)}</p>
<p><strong>Buyer:</strong> ${esc(buyerName)}</p>
<p><strong>Seller:</strong> ${esc(sellerName)}</p>
<p><strong>Reason:</strong> ${esc(reason.trim())}</p>
<p><a href="https://tackroomshop.com.au/admin/orders?status=disputed">View disputed orders →</a></p>`,
          });
        }
      })
    );
  } catch {
    // Non-blocking
  }

  return NextResponse.json({ ok: true });
}
