import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { ambassadorApprovedEmail, ambassadorDeniedEmail } from "@/lib/emails";

// PATCH /api/admin/ambassadors/[id] — approve or deny
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, admin_note } = await req.json() as { action: "approve" | "deny"; admin_note?: string };

  if (!["approve", "deny"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get the application to find the user_id
  const { data: app } = await admin
    .from("ambassador_applications")
    .select("user_id")
    .eq("id", id)
    .single();

  if (!app) return NextResponse.json({ error: "Application not found" }, { status: 404 });

  // Update application status
  await admin
    .from("ambassador_applications")
    .update({
      status: action === "approve" ? "approved" : "denied",
      admin_note: admin_note?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", id);

  // If approved, grant ambassador status on profile
  if (action === "approve") {
    await admin
      .from("profiles")
      .update({ is_ambassador: true, ambassador_since: new Date().toISOString() })
      .eq("id", app.user_id);
  } else {
    // If denied and was previously ambassador, revoke
    await admin
      .from("profiles")
      .update({ is_ambassador: false, ambassador_since: null })
      .eq("id", app.user_id);
  }

  // Send email notification
  try {
    const { data: authUser } = await admin.auth.admin.getUserById(app.user_id);
    const email = authUser?.user?.email;
    const fullName: string = authUser?.user?.user_metadata?.full_name ?? "";
    const firstName = fullName.split(" ")[0] || authUser?.user?.user_metadata?.username || "there";

    if (email) {
      if (action === "approve") {
        await sendEmail({
          to: email,
          subject: "You're now a Tack Room Ambassador! 🎉",
          html: ambassadorApprovedEmail(firstName),
        });
      } else {
        await sendEmail({
          to: email,
          subject: "Your ambassador application",
          html: ambassadorDeniedEmail(firstName, admin_note?.trim() || null),
        });
      }
    }
  } catch {
    // Don't block the response if email fails
  }

  return NextResponse.json({ success: true });
}
