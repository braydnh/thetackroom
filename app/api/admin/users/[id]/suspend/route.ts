/**
 * PATCH /api/admin/users/[id]/suspend
 * Admin only — suspend or unsuspend a user account.
 * Body: { is_suspended: boolean }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { accountSuspendedEmail } from "@/lib/emails";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { is_suspended } = await req.json() as { is_suspended: boolean };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ is_suspended }).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (is_suspended) {
    try {
      const [userAuth, { data: profile }] = await Promise.all([
        admin.auth.admin.getUserById(id),
        admin.from("profiles").select("display_name, username").eq("id", id).single(),
      ]);
      const userEmail = (userAuth as any).data?.user?.email;
      const name = profile?.display_name ?? profile?.username ?? "there";
      if (userEmail) {
        await sendEmail({
          to: userEmail,
          subject: "Your Tack Room account has been suspended",
          html: accountSuspendedEmail(name),
        });
      }
    } catch (err) {
      console.error("Suspension email failed:", err);
    }
  }

  return NextResponse.json({ success: true });
}
