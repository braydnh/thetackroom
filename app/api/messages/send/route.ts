/**
 * POST /api/messages/send
 *
 * Sends a message in a conversation and notifies the recipient by email.
 *
 * Body: { conversation_id: string; body: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { newMessageEmail } from "@/lib/emails";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { conversation_id, body } = await req.json() as { conversation_id: string; body: string };
  if (!conversation_id || !body?.trim()) {
    return NextResponse.json({ error: "conversation_id and body are required" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Verify user is a participant
  const { data: convo } = await admin
    .from("conversations")
    .select("id, buyer_id, seller_id, listing_id")
    .eq("id", conversation_id)
    .single();

  if (!convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  if (convo.buyer_id !== user.id && convo.seller_id !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Insert the message
  const { data: message, error: insertError } = await admin
    .from("messages")
    .insert({ conversation_id, sender_id: user.id, body: body.trim() })
    .select("id")
    .single();

  if (insertError) {
    const msg = insertError.message ?? "";
    if (msg.includes("CONTACT_INFO_DETECTED:")) {
      const reason = msg.split("CONTACT_INFO_DETECTED:")[1]?.trim() ?? "Contact details are not permitted in messages.";
      return NextResponse.json({ error: reason, code: "CONTACT_INFO_DETECTED" }, { status: 422 });
    }
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Update conversation last_message_at
  await admin
    .from("conversations")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", conversation_id);

  // Send email notification to recipient (non-blocking)
  const recipientId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;

  Promise.resolve().then(async () => {
    try {
      const [{ data: senderProfile }, { data: recipientData }] = await Promise.all([
        admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
        admin.auth.admin.getUserById(recipientId),
      ]);

      const recipientEmail = recipientData.user?.email;
      if (!recipientEmail) return;

      const { data: recipientProfile } = await admin
        .from("profiles")
        .select("display_name, username")
        .eq("id", recipientId)
        .single();

      await sendEmail({
        to: recipientEmail,
        subject: `New message from ${senderProfile?.username ?? "a user"}`,
        html: newMessageEmail({
          recipientName: recipientProfile?.display_name ?? recipientProfile?.username ?? "there",
          senderName: senderProfile?.username ?? "A user",
          messagePreview: body.trim().slice(0, 200),
          conversationId: conversation_id,
        }),
      });
    } catch {
      // Email failure should not affect message delivery
    }
  });

  return NextResponse.json({ id: message.id });
}
