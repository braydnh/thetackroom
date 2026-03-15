import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { seller_id, listing_ids, proposed_price, note } = await req.json() as {
    seller_id: string;
    listing_ids: string[];
    proposed_price: number; // in cents
    note?: string;
  };

  if (!seller_id || !listing_ids?.length || !proposed_price) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (seller_id === user.id) {
    return NextResponse.json({ error: "Cannot send bundle offer to yourself" }, { status: 400 });
  }
  if (proposed_price < 100) {
    return NextResponse.json({ error: "Minimum offer is $1.00" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  // Verify all listings belong to the seller and are active
  const { data: listingsData } = await admin
    .from("listings")
    .select("id, title")
    .eq("seller_id", seller_id)
    .eq("status", "active")
    .in("id", listing_ids);

  if (!listingsData || listingsData.length !== listing_ids.length) {
    return NextResponse.json({ error: "One or more listings are not available" }, { status: 400 });
  }

  // Create bundle offer record
  const { data: offer, error } = await admin
    .from("bundle_offers")
    .insert({
      buyer_id: user.id,
      seller_id,
      listing_ids,
      proposed_price,
      note: note?.trim() ?? null,
    })
    .select("id")
    .single();

  if (error || !offer) {
    return NextResponse.json({ error: error?.message ?? "Failed to create offer" }, { status: 500 });
  }

  // Find or create conversation between buyer and seller (no specific listing)
  const { data: existingConvo } = await admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", seller_id)
    .is("listing_id", null)
    .maybeSingle();

  let conversationId: string;
  if (existingConvo) {
    conversationId = existingConvo.id;
  } else {
    const { data: newConvo } = await admin
      .from("conversations")
      .insert({ buyer_id: user.id, seller_id })
      .select("id")
      .single();
    conversationId = newConvo.id;
  }

  // Update offer with conversation_id
  await admin.from("bundle_offers").update({ conversation_id: conversationId }).eq("id", offer.id);

  // Send system message in conversation
  await admin.from("messages").insert({
    conversation_id: conversationId,
    sender_id: user.id,
    body: `__BUNDLE_OFFER__:${offer.id}`,
  });

  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversationId);

  return NextResponse.json({ offer_id: offer.id, conversation_id: conversationId });
}
