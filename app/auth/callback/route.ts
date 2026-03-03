import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { welcomeEmail } from "@/lib/emails";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Send welcome email to new users (only once)
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && !user.user_metadata?.welcome_email_sent) {
          const admin = createAdminClient();
          const fullName: string = user.user_metadata?.full_name ?? "";
          const firstName = fullName.split(" ")[0] || user.user_metadata?.username || "there";
          const email = user.email;

          if (email) {
            await sendEmail({
              to: email,
              subject: "Welcome to The Tack Room!",
              html: welcomeEmail(firstName),
            });
          }

          await admin.auth.admin.updateUserById(user.id, {
            user_metadata: { ...user.user_metadata, welcome_email_sent: true },
          });
        }
      } catch {
        // Don't block the redirect if email fails
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
