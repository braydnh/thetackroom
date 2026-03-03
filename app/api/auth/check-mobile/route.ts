/**
 * POST /api/auth/check-mobile
 * Checks whether a mobile number is already registered.
 * Uses admin client so RLS doesn't prevent the lookup.
 * Returns { taken: boolean } — intentionally does not expose which user owns the number.
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const { mobile } = await req.json() as { mobile?: string };

  if (!mobile) return NextResponse.json({ taken: false });

  // Normalize to digits only for consistent comparison
  const normalized = mobile.replace(/\D/g, "");
  if (normalized.length < 8) return NextResponse.json({ taken: false });

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("mobile_number", normalized)
    .maybeSingle();

  return NextResponse.json({ taken: !!data });
}
