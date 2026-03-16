import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const admin = createAdminClient();

  const { data: comments, error } = await (admin as any)
    .from("feed_comments")
    .select(`id, body, created_at, parent_id, profiles:user_id (id, username, display_name, avatar_url)`)
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: comments ?? [] });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, parent_id } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data: comment, error } = await (admin as any)
    .from("feed_comments")
    .insert({ post_id: postId, user_id: user.id, body: body.trim(), parent_id: parent_id ?? null })
    .select(`id, body, created_at, parent_id, profiles:user_id (id, username, display_name, avatar_url)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Only increment comment_count for top-level comments
  if (!parent_id) {
    const { data: post } = await (admin as any).from("feed_posts").select("comment_count").eq("id", postId).single();
    await (admin as any).from("feed_posts").update({ comment_count: ((post as any)?.comment_count ?? 0) + 1 }).eq("id", postId);
  }

  return NextResponse.json({ comment }, { status: 201 });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const { searchParams } = new URL(req.url);
  const commentId = searchParams.get("comment_id");
  if (!commentId) return NextResponse.json({ error: "comment_id required" }, { status: 400 });

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: comment } = await (admin as any).from("feed_comments").select("user_id, parent_id").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (comment.user_id !== user.id && !(profile as any)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Deleting cascades to replies via DB foreign key
  await (admin as any).from("feed_comments").delete().eq("id", commentId);

  // Only decrement for top-level comment deletions
  if (!comment.parent_id) {
    const { data: post } = await (admin as any).from("feed_posts").select("comment_count").eq("id", postId).single();
    await (admin as any).from("feed_posts").update({ comment_count: Math.max(0, ((post as any)?.comment_count ?? 1) - 1) }).eq("id", postId);
  }

  return NextResponse.json({ deleted: true });
}
