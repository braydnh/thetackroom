import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { value } = await req.json() as { value: 1 | -1 };
  if (value !== 1 && value !== -1) return NextResponse.json({ error: "Invalid vote" }, { status: 400 });

  const admin = createAdminClient();

  // Check existing vote
  const { data: existing } = await admin
    .from("feature_request_votes")
    .select("value")
    .eq("user_id", user.id)
    .eq("request_id", id)
    .maybeSingle();

  let delta = 0;
  let newVote: number | null = null;

  if (!existing) {
    // New vote
    await admin.from("feature_request_votes").insert({ user_id: user.id, request_id: id, value });
    delta = value;
    newVote = value;
  } else if (existing.value === value) {
    // Toggle off
    await admin.from("feature_request_votes").delete().eq("user_id", user.id).eq("request_id", id);
    delta = -value;
    newVote = null;
  } else {
    // Switch vote
    await admin.from("feature_request_votes").update({ value }).eq("user_id", user.id).eq("request_id", id);
    delta = value * 2;
    newVote = value;
  }

  // Update vote_count
  const { data: current } = await admin
    .from("feature_requests")
    .select("vote_count")
    .eq("id", id)
    .single();

  const newCount = ((current as any)?.vote_count ?? 0) + delta;
  await admin.from("feature_requests").update({ vote_count: newCount }).eq("id", id);

  return NextResponse.json({ vote_count: newCount, userVote: newVote });
}
