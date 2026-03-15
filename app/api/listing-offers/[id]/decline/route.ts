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
    .select("id, listing_id, buyer_id, seller_id, status, conversation_id")
    .eq("id", id)
    .single();

  if (!offer) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (offer.seller_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (offer.status !== "pending") return NextResponse.json({ error: "Offer is no longer pending" }, { status: 400 });

  await admin.from("listing_offers").update({ status: "declined" }).eq("id", id);

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
    type: "offer_declined",
    title: "Offer declined",
    body: "Your offer was declined by the seller.",
    link: `/messages/${offer.conversation_id}`,
  });

  return NextResponse.json({ success: true });
}
