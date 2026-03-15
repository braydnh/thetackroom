import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sort = searchParams.get("sort") ?? "top";
  const status = searchParams.get("status") ?? "all";

  const admin = createAdminClient() as any;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let query = admin
    .from("feature_requests")
    .select("id, title, description, status, vote_count, created_at, user_id, profiles!user_id(username, avatar_url)");

  if (status !== "all") query = query.eq("status", status);

  if (sort === "top") {
    query = query.order("vote_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  const { data: requests } = await query.limit(50);

  let userVotes: Record<string, number> = {};
  if (user && requests?.length) {
    const { data: votes } = await admin
      .from("feature_request_votes")
      .select("request_id, value")
      .eq("user_id", user.id)
      .in("request_id", requests.map((r: any) => r.id));
    (votes ?? []).forEach((v: any) => { userVotes[v.request_id] = v.value; });
  }

  const commentCounts: Record<string, number> = {};
  if (requests?.length) {
    const { data: counts } = await admin
      .from("feature_request_comments")
      .select("request_id")
      .in("request_id", requests.map((r: any) => r.id));
    (counts ?? []).forEach((c: any) => {
      commentCounts[c.request_id] = (commentCounts[c.request_id] ?? 0) + 1;
    });
  }

  const result = (requests ?? []).map((r: any) => ({
    ...r,
    userVote: userVotes[r.id] ?? null,
    commentCount: commentCounts[r.id] ?? 0,
  }));

  return NextResponse.json({ requests: result });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, description } = await req.json() as { title: string; description?: string };
  if (!title?.trim() || title.trim().length < 5) {
    return NextResponse.json({ error: "Title must be at least 5 characters" }, { status: 400 });
  }

  const { data, error } = await (supabase as any)
    .from("feature_requests")
    .insert({ user_id: user.id, title: title.trim(), description: description?.trim() ?? null })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: (data as any).id });
}
