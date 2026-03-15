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

  const admin = createAdminClient() as any;

  const { data: offer } = await admin
    .from("listing_offers")
    .select("id, listing_id, buyer_id, seller_id, offered_price, counter_price, accepted_price, note, status, conversation_id, expires_at, created_at")
    .eq("id", id)
    .single();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.buyer_id !== user.id && offer.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch listing info
  const { data: listing } = await admin
    .from("listings")
    .select("id, title, price, primary_image_url, status")
    .eq("id", offer.listing_id)
    .single();

  // Fetch buyer profile
  const { data: buyer } = await admin
    .from("profiles")
    .select("username, avatar_url")
    .eq("id", offer.buyer_id)
    .single();

  return NextResponse.json({ offer: { ...offer, listing, buyer } });
}
