import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
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
    .select("id, listing_id, buyer_id, seller_id, offered_price, status, conversation_id")
    .eq("id", id)
    .single();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (offer.status !== "pending") return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });

  const { data: listing } = await admin.from("listings").select("title").eq("id", offer.listing_id).single();

  await admin.from("listing_offers").update({
    status: "accepted",
    accepted_price: offer.offered_price,
  }).eq("id", id);

  // Send update message in conversation
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
    type: "offer_accepted",
    title: "Your offer was accepted! 🎉",
    body: `Your offer on "${listing?.title ?? "your item"}" was accepted. Complete your purchase now.`,
    link: `/checkout/${offer.listing_id}?offer=${id}`,
  });

  return NextResponse.json({ success: true });
}
