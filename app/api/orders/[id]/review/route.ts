/**
 * POST /api/orders/[id]/review
 *
 * Buyer submits a review for the seller after a completed order.
 * One review per order — idempotent.
 *
 * Body: { rating: 1-5; comment?: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { newReviewEmail } from "@/lib/emails";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rating, comment } = await req.json() as { rating: number; comment?: string };

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating must be 1–5" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify order: must be completed and buyer must be current user
  const { data: order } = await admin
    .from("orders")
    .select("id, buyer_id, seller_id, status, listing_id, listings(title)")
    .eq("id", id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  if ((order as any).buyer_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if ((order as any).status !== "completed") {
    return NextResponse.json({ error: "You can only review completed orders" }, { status: 400 });
  }

  // Idempotency — check if review already exists
  const { data: existing } = await admin
    .from("reviews")
    .select("id")
    .eq("order_id", id)
    .eq("reviewer_id", user.id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "You've already reviewed this order" }, { status: 409 });
  }

  // Insert review
  const { error } = await admin.from("reviews").insert({
    order_id: id,
    reviewer_id: user.id,
    reviewee_id: (order as any).seller_id,
    rating: Math.round(rating),
    comment: comment?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Update seller's average_rating + total_sales (via DB trigger ideally, but do it here as fallback)
  // The schema should have a trigger for this — if not, we calculate manually
  const { data: reviews } = await admin
    .from("reviews")
    .select("rating")
    .eq("reviewee_id", (order as any).seller_id);

  if (reviews && reviews.length > 0) {
    const avg = reviews.reduce((sum: number, r: any) => sum + r.rating, 0) / reviews.length;
    await admin
      .from("profiles")
      .update({ average_rating: Math.round(avg * 10) / 10 })
      .eq("id", (order as any).seller_id);
  }

  // Notify the seller
  const sellerId = (order as any).seller_id;
  const listingTitle = (order as any).listings?.title ?? "your listing";

  const [{ data: sellerProfile }, { data: sellerAuthData }, { data: buyerProfile }] = await Promise.all([
    admin.from("profiles").select("username, display_name").eq("id", sellerId).single(),
    admin.auth.admin.getUserById(sellerId),
    admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
  ]);

  const sellerName = sellerProfile?.display_name || sellerProfile?.username || "there";
  const buyerName = buyerProfile?.display_name || buyerProfile?.username || "A buyer";
  const sellerEmail = sellerAuthData.user?.email;

  // In-app notification
  await admin.from("notifications").insert({
    user_id: sellerId,
    type: "new_review",
    title: "New review received",
    body: `${buyerName} left you a ${rating}-star review for ${listingTitle}.`,
    url: `/profile/${sellerProfile?.username}`,
  });

  // Email notification
  if (sellerEmail) {
    await sendEmail({
      to: sellerEmail,
      subject: `${buyerName} left you a ${rating}-star review`,
      html: newReviewEmail({
        sellerName,
        buyerName,
        listingTitle,
        rating,
        comment,
        profileUrl: `https://tackroomshop.com.au/profile/${sellerProfile?.username}`,
      }),
    });
  }

  return NextResponse.json({ success: true });
}
