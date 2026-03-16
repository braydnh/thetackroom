import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id: postId } = await params;
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Check if already liked
  const { data: existing } = await (admin as any)
    .from("feed_likes")
    .select("post_id")
    .eq("user_id", user.id)
    .eq("post_id", postId)
    .single();

  if (existing) {
    // Unlike — remove like and decrement count
    await (admin as any).from("feed_likes").delete().eq("user_id", user.id).eq("post_id", postId);
    const { data: post } = await (admin as any).from("feed_posts").select("like_count").eq("id", postId).single();
    await (admin as any).from("feed_posts").update({ like_count: Math.max(0, ((post as any)?.like_count ?? 1) - 1) }).eq("id", postId);
    return NextResponse.json({ liked: false });
  } else {
    // Like — insert and increment count
    await (admin as any).from("feed_likes").insert({ user_id: user.id, post_id: postId });
    const { data: post } = await (admin as any).from("feed_posts").select("like_count").eq("id", postId).single();
    await (admin as any).from("feed_posts").update({ like_count: ((post as any)?.like_count ?? 0) + 1 }).eq("id", postId);
    return NextResponse.json({ liked: true });
  }
}
