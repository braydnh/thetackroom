/**
 * GET /auth/confirm
 *
 * Handles Supabase email confirmation links (signup, password reset, etc.)
 * so they use tackroomshop.com.au instead of supabase.co — fixing Resend's
 * "link URLs match sending domain" deliverability warning.
 *
 * Supabase email template should link to:
 *   https://tackroomshop.com.au/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "signup"
    | "recovery"
    | "invite"
    | "magiclink"
    | "email_change"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
