/**
 * POST /api/admin/founding-sellers/import
 * Admin only — bulk import founding seller emails.
 * Also tries to match existing users and grant them the badge.
 * Body: { emails: string[] }
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { emails } = await req.json() as { emails: string[] };
  if (!Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "emails required" }, { status: 400 });
  }

  const admin = createAdminClient();
  let imported = 0;
  let skipped = 0;

  for (const email of emails.slice(0, 500)) {
    const { error } = await admin
      .from("founding_sellers_import")
      .insert({ email })
      .select();

    if (error) {
      // Likely duplicate — skip
      skipped++;
      continue;
    }
    imported++;

    // Try to match existing auth user
    const { data: users } = await admin.auth.admin.listUsers();
    const match = (users?.users ?? []).find((u: any) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) {
      await admin
        .from("profiles")
        .update({ is_founding_seller: true, founding_seller_since: new Date().toISOString() })
        .eq("id", match.id);

      await admin
        .from("founding_sellers_import")
        .update({ matched_at: new Date().toISOString() })
        .eq("email", email);
    }
  }

  return NextResponse.json({ imported, skipped });
}
