/**
 * POST /api/messages/read
 *
 * Marks all unread messages in a conversation as read for the current user.
 * Uses the admin client to bypass RLS (user can only mark messages FROM others).
 *
 * Body: { conversation_id: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id } = await req.json() as { conversation_id: string };
  if (!conversation_id) return NextResponse.json({ error: "conversation_id is required" }, { status: 400 });

  const admin = createAdminClient();

  // Verify the user is a participant
  const { data: convo } = await admin
    .from("conversations")
    .select("buyer_id, seller_id")
    .eq("id", conversation_id)
    .single();

  if (!convo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (convo.buyer_id !== user.id && convo.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Mark all unread messages from the other party as read
  await admin
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("conversation_id", conversation_id)
    .neq("sender_id", user.id)
    .is("read_at", null);

  return NextResponse.json({ ok: true });
}
