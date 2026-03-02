/**
 * PATCH /api/admin/config
 * Admin only — upsert a platform config key/value.
 * Body: { key: string; value: string }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { key, value } = await req.json() as { key: string; value: string };
  if (!key || value === undefined) {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }

  const ALLOWED_KEYS = ["commission_pct", "ambassador_commission_pct", "admin_commission_pct", "dispute_window_hours", "tracking_deadline_days"];
  if (!ALLOWED_KEYS.includes(key)) {
    return NextResponse.json({ error: "Unknown config key" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_config")
    .upsert({ key, value }, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
