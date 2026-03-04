/**
 * POST /api/messages/conversations
 *
 * Creates or retrieves an existing conversation between a buyer and seller,
 * optionally linked to a listing.
 *
 * Caller can be the buyer (pass seller_id) or the seller (pass buyer_id).
 *
 * Body: { seller_id?: string; buyer_id?: string; listing_id?: string }
 * Returns: { conversation_id: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { seller_id, buyer_id, listing_id } = await req.json() as {
    seller_id?: string;
    buyer_id?: string;
    listing_id?: string;
  };

  // Caller can be the buyer (passes seller_id) or the seller (passes buyer_id)
  const isSeller = !!buyer_id && !seller_id;
  const resolvedBuyerId = isSeller ? buyer_id! : user.id;
  const resolvedSellerId = isSeller ? user.id : seller_id!;

  if (!resolvedSellerId || !resolvedBuyerId) {
    return NextResponse.json({ error: "seller_id or buyer_id required" }, { status: 400 });
  }
  if (resolvedSellerId === resolvedBuyerId) {
    return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check for existing conversation between these parties
  let existingQuery = admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", resolvedBuyerId)
    .eq("seller_id", resolvedSellerId);

  if (listing_id) {
    existingQuery = existingQuery.eq("listing_id", listing_id) as any;
  }

  const { data: existing } = await (existingQuery as any).maybeSingle();

  if (existing) {
    return NextResponse.json({ conversation_id: existing.id });
  }

  // Create new conversation
  const { data: conversation, error } = await admin
    .from("conversations")
    .insert({
      buyer_id: resolvedBuyerId,
      seller_id: resolvedSellerId,
      listing_id: listing_id ?? null,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: error?.message ?? "Failed to create conversation" }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: conversation.id });
}
