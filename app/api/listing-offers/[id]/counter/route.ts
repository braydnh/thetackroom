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

  const { counter_price } = await req.json() as { counter_price: number };
  if (!counter_price || counter_price < 100) {
    return NextResponse.json({ error: "Invalid counter price" }, { status: 400 });
  }

  const admin = createAdminClient() as any;

  const { data: offer } = await admin
    .from("listing_offers")
    .select("id, listing_id, buyer_id, seller_id, offered_price, status, conversation_id")
    .eq("id", id)
    .single();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (offer.status !== "pending") return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });

  // Counter must be between buyer's offer and listing price
  const { data: listing } = await admin.from("listings").select("title, price").eq("id", offer.listing_id).single();
  if (counter_price <= offer.offered_price) {
    return NextResponse.json({ error: "Counter must be higher than the buyer's offer" }, { status: 400 });
  }
  if (listing && counter_price >= listing.price) {
    return NextResponse.json({ error: "Counter must be lower than the listing price" }, { status: 400 });
  }

  await admin.from("listing_offers").update({
    status: "countered",
    counter_price,
  }).eq("id", id);

  // Send update message so both parties see the counter
  if (offer.conversation_id) {
    await admin.from("messages").insert({
      conversation_id: offer.conversation_id,
      sender_id: user.id,
      body: `__LISTING_OFFER__:${id}`,
    });
    await admin.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", offer.conversation_id);
  }

  // Notify buyer
  await admin.from("notifications").insert({
    user_id: offer.buyer_id,
    type: "offer_countered",
    title: "Counter offer received",
    body: `The seller made a counter offer on "${listing?.title ?? "your item"}"`,
    link: `/messages/${offer.conversation_id}`,
  });

  return NextResponse.json({ success: true });
}
