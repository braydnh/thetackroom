/**
 * POST /api/messages/conversations
 *
 * Creates or retrieves an existing conversation between the current user (buyer)
 * and a seller, optionally linked to a listing.
 *
 * Body: { seller_id: string; listing_id?: string }
 * Returns: { conversation_id: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { seller_id, listing_id } = await req.json() as { seller_id: string; listing_id?: string };

  if (!seller_id) return NextResponse.json({ error: "seller_id required" }, { status: 400 });
  if (seller_id === user.id) return NextResponse.json({ error: "Cannot message yourself" }, { status: 400 });

  const admin = createAdminClient();

  // Check for existing conversation between these parties for this listing
  let existingQuery = admin
    .from("conversations")
    .select("id")
    .eq("buyer_id", user.id)
    .eq("seller_id", seller_id);

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
      buyer_id: user.id,
      seller_id,
      listing_id: listing_id ?? null,
    })
    .select("id")
    .single();

  if (error || !conversation) {
    return NextResponse.json({ error: error?.message ?? "Failed to create conversation" }, { status: 500 });
  }

  return NextResponse.json({ conversation_id: conversation.id });
}
