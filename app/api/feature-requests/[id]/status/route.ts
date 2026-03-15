import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_STATUSES = ["pending", "under_review", "planned", "in_progress", "done", "rejected"];

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if ((profile as any)?.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status } = await req.json() as { status: string };
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: "Invalid status" }, { status: 400 });

  const { data: request } = await admin.from("feature_requests").select("title, status").eq("id", id).single();
  if (!request) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await admin.from("feature_requests").update({ status }).eq("id", id);

  // Notify all Yay voters when feature is done
  if (status === "done" && (request as any).status !== "done") {
    const { data: yayVoters } = await admin
      .from("feature_request_votes")
      .select("user_id")
      .eq("request_id", id)
      .eq("value", 1);

    if (yayVoters?.length) {
      await admin.from("notifications").insert(
        yayVoters.map((v: any) => ({
          user_id: v.user_id,
          type: "feature_shipped",
          title: "Feature shipped! 🎉",
          body: `"${(request as any).title}" has been built — go check it out!`,
          link: "/feature-requests",
        }))
      );
    }
  }

  return NextResponse.json({ success: true, status });
}
