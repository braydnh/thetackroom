import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const admin = createAdminClient();

  const { data: post, error } = await admin
    .from("feed_posts")
    .select(`id, body, topic, image_urls, like_count, comment_count, created_at, profiles:user_id (id, username, display_name, avatar_url)`)
    .eq("id", id)
    .single();

  if (error || !post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ post });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: post } = await admin.from("feed_posts").select("user_id").eq("id", id).single();
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Allow own post or admin
  const { data: profile } = await admin.from("profiles").select("is_admin").eq("id", user.id).single();
  if (post.user_id !== user.id && !(profile as any)?.is_admin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await admin.from("feed_posts").delete().eq("id", id);
  return NextResponse.json({ deleted: true });
}
