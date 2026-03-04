/**
 * POST /api/auth/send-welcome
 *
 * Sends a welcome email to the currently authenticated user.
 * Idempotent — skips if welcome_email_sent is already set in user_metadata.
 * Called immediately after email/password signup (which bypasses /auth/callback).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/emails";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Idempotency — only send once
  if (user.user_metadata?.welcome_email_sent) {
    return NextResponse.json({ skipped: true });
  }

  const email = user.email;
  if (email) {
    const fullName: string = user.user_metadata?.full_name ?? "";
    const firstName = fullName.split(" ")[0] || user.user_metadata?.username || "there";

    try {
      await sendEmail({
        to: email,
        subject: "Welcome to The Tack Room!",
        html: welcomeEmail(firstName),
      });
    } catch (err) {
      console.error("Welcome email send failed:", err);
    }
  }

  // Mark as sent so it doesn't fire again (e.g. if they later sign in via Google)
  const admin = createAdminClient();
  await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, welcome_email_sent: true },
  });

  return NextResponse.json({ sent: true });
}
