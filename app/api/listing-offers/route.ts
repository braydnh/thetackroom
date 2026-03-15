import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { listing_id, offered_price, note } = await req.json() as {
    listing_id: string;
    offered_price: number; // in cents
    note?: string;
  };

  if (!listing_id || !offered_price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (offered_price < 100) {
    return NextResponse.json({ error: "Minimum offer is $1.00" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  // Fetch the listing to verify it's active and get seller_id
  const { data: listing } = await admin
    .from("listings")
    .select("id, title, price, seller_id, status")
    .eq("id", listing_id)
    .eq("status", "active")
    .single();

  if (!listing) return NextResponse.json({ error: "Listing not found or unavailable" }, { status: 404 });
  if (listing.seller_id === user.id) return NextResponse.json({ error: "Cannot offer on your own listing" }, { status: 400 });
  if (offered_price >= listing.price) return NextResponse.json({ error: "Offer must be lower than the listing price" }, { status: 400 });

  // Check for existing pending offer from this buyer on this listing
  const { data: existingOffer } = await admin
    .from("listing_offers")
    .select("id, status")
    .eq("listing_id", listing_id)
    .eq("buyer_id", user.id)
    .in("status", ["pending", "countered"])
    .maybeSingle();

  if (existingOffer) {
    return NextResponse.json({ error: "You already have an active offer on this listing" }, { status: 409 });
  }

  // Create the offer record
  const { data: offer, error } = await admin
    .from("listing_offers")
    .insert({
      listing_id,
      buyer_id: user.id,
      seller_id: listing.seller_id,
      offered_price,
      note: note?.trim() ?? null,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: error?.message ?? "Failed to create offer" }, { status: 500 });
  }

  // Find or create conversation between buyer and seller for this listing
  const { data: existingConvo } = await admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", listing.seller_id)
    .eq("listing_id", listing_id)
    .maybeSingle();

  let conversationId: string;
  if (existingConvo) {
    conversationId = existingConvo.id;
  } else {
    const { data: newConvo } = await admin
      .from("conversations")
      .insert({ buyer_id: user.id, seller_id: listing.seller_id, listing_id })
      .select("id")
      .single();
    conversationId = newConvo.id;
  }

  // Store conversation_id on the offer
  await admin.from("listing_offers").update({ conversation_id: conversationId }).eq("id", offer.id);

  // Send offer message in conversation
  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: `__LISTING_OFFER__:${offer.id}`,
  });

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  // Notify seller
  await admin.from("notifications").insert({
    user_id: listing.seller_id,
    type: "new_offer",
    title: "New offer on your listing",
    body: `You received an offer on "${listing.title}"`,
    link: `/messages/${conversationId}`,
  });

  return NextResponse.json({ offer_id: offer.id, conversation_id: conversationId });
}
