/**
 * POST /api/listings/[listing_id]/notify-followers
 *
 * Called after a listing is published. Finds all users who follow the seller
 * and creates an in-app notification for each of them.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ listing_id: string }> }
) {
  const { listing_id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Get the listing to confirm it belongs to this user and get the title
  const { data: listing } = await admin
    .from("listings")
    .select("id, title, seller_id")
    .eq("id", listing_id)
    .eq("seller_id", user.id)
    .single();

  if (!listing) return NextResponse.json({ ok: true }); // silently skip if not found

  // Get seller profile for the notification body
  const { data: seller } = await admin
    .from("profiles")
    .select("username, display_name")
    .eq("id", user.id)
    .single();

  const sellerName = (seller as any)?.display_name ?? (seller as any)?.username ?? "Someone you follow";

  // Get all followers
  const { data: follows } = await (admin as any)
    .from("follows")
    .select("follower_id")
    .eq("following_id", user.id);

  if (!follows?.length) return NextResponse.json({ ok: true });

  // Bulk insert notifications
  const notifications = (follows as any[]).map((f) => ({
    user_id: f.follower_id,
    type: "new_listing",
    title: `${sellerName} just listed something new`,
    body: `"${(listing as any).title}" is now available.`,
    link: `/listings/${listing_id}`,
  }));

  await admin.from("notifications").insert(notifications);

  return NextResponse.json({ ok: true, notified: notifications.length });
}
