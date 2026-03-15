import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { final_price, shipping_price } = await req.json() as {
    final_price: number; // in cents
    shipping_price: number; // in cents
  };

  if (!final_price || final_price < 100) {
    return NextResponse.json({ error: "Invalid final price" }, { status: 400 });
  }
  if (typeof shipping_price !== "number" || shipping_price < 0) {
    return NextResponse.json({ error: "Invalid shipping price" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  const { data: offer } = await admin
    .from("bundle_offers")
    .select("id, buyer_id, seller_id, listing_ids, proposed_price, note, status, conversation_id")
    .eq("id", id)
    .single();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (offer.status !== "pending") return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });

  // Fetch buyer profile for listing title
  const { data: buyer } = await admin
    .from("profiles")
    .select("username")
    .eq("id", offer.buyer_id)
    .single();

  // Fetch item titles for description
  const { data: listings } = await admin
    .from("listings")
    .select("title")
    .in("id", offer.listing_ids);

  const itemTitles = (listings ?? []).map((l: any) => l.title).join(", ");

  // Create bundle listing
  const { data: bundleListing, error: listingError } = await admin
    .from("listings")
    .insert({
      seller_id: offer.seller_id,
      title: `Bundle for @${buyer?.username ?? "buyer"}`,
      description: `Custom bundle offer.\n\nIncludes: ${itemTitles}${offer.note ? `\n\nBuyer note: ${offer.note}` : ""}`,
      price: final_price,
      shipping_price: shipping_price,
      allows_shipping: true,
      allows_pickup: false,
      status: "active",
      category: "horse",
      condition: "good",
    })
    .select("id")
    .single();

  if (listingError || !bundleListing) {
    return NextResponse.json({ error: listingError?.message ?? "Failed to create bundle listing" }, { status: 500 });
  }

  // Mark original listings as reserved
  await admin.from("listings").update({ status: "reserved" }).in("id", offer.listing_ids);

  // Update offer record
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
  await admin.from("bundle_offers").update({
    status: "accepted",
    final_price,
    shipping_price,
    bundle_listing_id: bundleListing.id,
    expires_at: expiresAt,
  }).eq("id", id);

  // Notify buyer via in-app notification
  await admin.from("notifications").insert({
    user_id: offer.buyer_id,
    type: "bundle_accepted",
    title: "Bundle offer accepted! 🎉",
    body: `Your bundle offer was accepted. Complete your purchase within 48 hours before it expires.`,
    link: `/listings/${bundleListing.id}`,
  });

  // Send confirmation message in conversation
  if (offer.conversation_id) {
    await admin.from("messages").insert({
      conversation_id: offer.conversation_id,
      sender_id: user.id,
      body: `__BUNDLE_ACCEPTED__:${bundleListing.id}`,
    });
    await admin
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", offer.conversation_id);
  }

  return NextResponse.json({ bundle_listing_id: bundleListing.id });
}
