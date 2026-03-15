import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const admin = createAdminClient() as any;

  const { data: comments } = await admin
    .from("feature_request_comments")
    .select("id, body, created_at, user_id, profiles!user_id(username, avatar_url)")
    .eq("request_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  return NextResponse.json({ comments: comments ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body } = await req.json() as { body: string };
  if (!body?.trim()) return NextResponse.json({ error: "Comment cannot be empty" }, { status: 400 });
  if (body.trim().length > 500) return NextResponse.json({ error: "Comment too long" }, { status: 400 });

  const admin = createAdminClient() as any;
  const { data, error } = await admin
    .from("feature_request_comments")
    .insert({ request_id: id, user_id: user.id, body: body.trim() })
    .select("id, body, created_at, user_id, profiles!user_id(username, avatar_url)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: requestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { commentId } = await req.json() as { commentId: string };
  const admin = createAdminClient() as any;

  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  const isAdmin = (profile as any)?.role === "admin";

  const { data: comment } = await admin
    .from("feature_request_comments")
    .select("user_id")
    .eq("id", commentId)
    .eq("request_id", requestId)
    .single();

  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isAdmin && (comment as any).user_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await admin.from("feature_request_comments").delete().eq("id", commentId);
  return NextResponse.json({ success: true });
}
