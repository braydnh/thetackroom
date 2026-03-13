/**
 * GET  /api/admin/coupons       — list all coupons
 * POST /api/admin/coupons       — create a new coupon
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  return profile?.role === "admin" ? admin : null;
}

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await admin
    .from("coupon_codes")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { code, discount_type, discount_value, max_uses, expires_at } = body;

  if (!code?.trim()) return NextResponse.json({ error: "Code is required" }, { status: 400 });
  if (!["percentage", "fixed"].includes(discount_type)) return NextResponse.json({ error: "Invalid discount type" }, { status: 400 });
  if (!discount_value || Number(discount_value) <= 0) return NextResponse.json({ error: "Discount value must be > 0" }, { status: 400 });
  if (discount_type === "percentage" && Number(discount_value) > 100) return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });

  const { data, error } = await admin
    .from("coupon_codes")
    .insert({
      code: code.trim().toUpperCase(),
      discount_type,
      discount_value: Number(discount_value),
      max_uses: max_uses ? Number(max_uses) : null,
      expires_at: expires_at || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "A coupon with that code already exists" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
