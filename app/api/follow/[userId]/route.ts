import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// GET — check if current user follows this profile + get counts
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  const [{ count: followerCount }, { count: followingCount }] = await Promise.all([
    (admin as any).from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    (admin as any).from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
  ]);

  let isFollowing = false;
  if (user) {
    const { data } = await (admin as any)
      .from("follows")
      .select("follower_id")
      .eq("follower_id", user.id)
      .eq("following_id", userId)
      .single();
    isFollowing = !!data;
  }

  return NextResponse.json({ isFollowing, followerCount: followerCount ?? 0, followingCount: followingCount ?? 0 });
}

// POST — toggle follow/unfollow
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.id === userId) return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await (admin as any)
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .single();

  if (existing) {
    await (admin as any).from("follows").delete().eq("follower_id", user.id).eq("following_id", userId);
    return NextResponse.json({ isFollowing: false });
  } else {
    await (admin as any).from("follows").insert({ follower_id: user.id, following_id: userId });

    // Notify the person being followed
    const { data: followerProfile } = await (admin as any)
      .from("profiles")
      .select("username, display_name")
      .eq("id", user.id)
      .single();
    const name = followerProfile?.display_name ?? followerProfile?.username ?? "Someone";
    await (admin as any).from("notifications").insert({
      user_id: userId,
      type: "new_follower",
      title: "New follower!",
      body: `${name} started following you.`,
      link: `/profile/${followerProfile?.username}`,
    });

    return NextResponse.json({ isFollowing: true });
  }
}
