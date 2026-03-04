/**
 * POST /api/auth/send-welcome
 *
 * Sends a welcome email after email/password signup.
 * Accepts { email, firstName } in the body — avoids relying on server-side
 * session cookies which may not be propagated immediately after signUp().
 * Uses admin client to look up the user by email and mark welcome_email_sent.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/emails";

export async function POST(req: Request) {
  const { email, firstName } = await req.json() as { email?: string; firstName?: string };

  if (!email) return NextResponse.json({ error: "Missing email" }, { status: 400 });

  const admin = createAdminClient();

  // Look up the user by email
  const { data: { users } } = await admin.auth.admin.listUsers();
  const user = users.find((u) => u.email === email);

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  // Idempotency — only send once
  if (user.user_metadata?.welcome_email_sent) {
    return NextResponse.json({ skipped: true });
  }

  const name = firstName?.trim() || user.user_metadata?.username || "there";

  try {
    await sendEmail({
      to: email,
      subject: "Welcome to The Tack Room!",
      html: welcomeEmail(name),
    });
  } catch (err) {
    console.error("Welcome email send failed:", err);
  }

  // Mark as sent so it doesn't fire again (e.g. if they later sign in via Google)
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, welcome_email_sent: true },
  });

  return NextResponse.json({ sent: true });
}
