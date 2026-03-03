import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { motivation, instagram_handle, tiktok_handle, facebook_url, follower_count } = await req.json();

  if (!motivation?.trim() || motivation.trim().length < 20) {
    return NextResponse.json({ error: "Please write at least a sentence about why you'd like to be an ambassador." }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check for existing application
  const { data: existing } = await admin
    .from("ambassador_applications")
    .select("id, status")
    .eq("user_id", user.id)
    .single();

  if (existing) {
    if (existing.status === "pending") {
      return NextResponse.json({ error: "You already have a pending application." }, { status: 409 });
    }
    if (existing.status === "approved") {
      return NextResponse.json({ error: "You are already an ambassador." }, { status: 409 });
    }
    // denied — allow reapplication by updating
    const { error } = await admin
      .from("ambassador_applications")
      .update({
        motivation: motivation.trim(),
        instagram_handle: instagram_handle?.trim() || null,
        tiktok_handle: tiktok_handle?.trim() || null,
        facebook_url: facebook_url?.trim() || null,
        follower_count: follower_count ? parseInt(follower_count) : null,
        status: "pending",
        admin_note: null,
        reviewed_by: null,
        reviewed_at: null,
      })
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  const { error } = await admin.from("ambassador_applications").insert({
    user_id: user.id,
    motivation: motivation.trim(),
    instagram_handle: instagram_handle?.trim() || null,
    tiktok_handle: tiktok_handle?.trim() || null,
    facebook_url: facebook_url?.trim() || null,
    follower_count: follower_count ? parseInt(follower_count) : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
