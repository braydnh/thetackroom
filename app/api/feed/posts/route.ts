import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const topic = searchParams.get("topic");
  const view = searchParams.get("view");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20"), 50);
  const offset = parseInt(searchParams.get("offset") ?? "0");

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // For following tab, get followed user IDs first
  let followedIds: string[] = [];
  if (view === "following" && user) {
    const { data: follows } = await (admin as any)
      .from("follows")
      .select("following_id")
      .eq("follower_id", user.id);
    followedIds = (follows ?? []).map((f: any) => f.following_id);
    if (followedIds.length === 0) {
      return NextResponse.json({ posts: [], hasMore: false });
    }
  }

  let query = (admin as any)
    .from("feed_posts")
    .select(`
      id, body, topic, image_urls, like_count, comment_count, created_at,
      profiles:user_id (id, username, display_name, avatar_url)
    `)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (view === "following") {
    query = query.in("user_id", followedIds) as any;
  } else if (topic && topic !== "all") {
    query = query.eq("topic", topic) as any;
  }

  const { data: posts, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Fetch current user's likes
  let likedPostIds = new Set<string>();
  if (user) {
    const { data: likes } = await (admin as any)
      .from("feed_likes")
      .select("post_id")
      .eq("user_id", user.id);
    likedPostIds = new Set((likes ?? []).map((l: any) => l.post_id));
  }

  const postsWithLikes = (posts ?? []).map((p: any) => ({
    ...p,
    liked: likedPostIds.has(p.id),
  }));

  return NextResponse.json({ posts: postsWithLikes, hasMore: postsWithLikes.length === limit });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { body, topic, image_urls } = await req.json();
  if (!body?.trim()) return NextResponse.json({ error: "Body is required" }, { status: 400 });

  const admin = createAdminClient();
  const { data, error } = await (admin as any)
    .from("feed_posts")
    .insert({ user_id: user.id, body: body.trim(), topic: topic ?? "general", image_urls: image_urls ?? [] })
    .select(`id, body, topic, image_urls, like_count, comment_count, created_at, profiles:user_id (id, username, display_name, avatar_url)`)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ post: { ...data, liked: false } }, { status: 201 });
}
