/**
 * GET /api/coupons/validate?code=XXX&subtotal=CENTS
 *
 * Validates a coupon code and returns the discount amount (in cents).
 * Does NOT increment uses_count — that happens in create-payment-intent when the order is placed.
 *
 * Returns: { valid: true, code, discount_type, discount_value, discount_amount }
 *       or { valid: false, error: string }
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code")?.trim();
  const subtotal = parseInt(searchParams.get("subtotal") ?? "0", 10);

  if (!code) return NextResponse.json({ valid: false, error: "No code provided" }, { status: 400 });

  const admin = createAdminClient();

  const { data: coupon } = await admin
    .from("coupon_codes")
    .select("id, code, discount_type, discount_value, max_uses, uses_count, expires_at, is_active")
    .filter("upper(code)", "eq", code.toUpperCase())
    .maybeSingle();

  if (!coupon || !coupon.is_active) {
    return NextResponse.json({ valid: false, error: "Invalid or inactive coupon code" });
  }

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return NextResponse.json({ valid: false, error: "This coupon has expired" });
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit" });
  }

  // Calculate discount in cents (applies to item subtotal only, not shipping)
  let discountAmount: number;
  if (coupon.discount_type === "percentage") {
    discountAmount = Math.floor(subtotal * Number(coupon.discount_value) / 100);
  } else {
    // fixed — stored as dollars, convert to cents
    discountAmount = Math.floor(Number(coupon.discount_value) * 100);
  }
  // Can't discount more than the subtotal
  discountAmount = Math.min(discountAmount, subtotal);

  return NextResponse.json({
    valid: true,
    code: coupon.code,
    discount_type: coupon.discount_type,
    discount_value: Number(coupon.discount_value),
    discount_amount: discountAmount,
  });
}
