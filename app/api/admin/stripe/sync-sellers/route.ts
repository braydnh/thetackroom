/**
 * POST /api/admin/stripe/sync-sellers
 *
 * Checks all profiles with stripe_onboarding_complete = true against Stripe.
 * Any whose account has charges_enabled = false OR payouts_enabled = false
 * gets reset to stripe_onboarding_complete = false and role = "buyer".
 *
 * Returns a summary of how many were checked and which were fixed.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: callerProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if ((callerProfile as any)?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: sellers } = await admin
    .from("profiles")
    .select("id, username, stripe_account_id")
    .eq("stripe_onboarding_complete", true)
    .not("stripe_account_id", "is", null);

  if (!sellers || sellers.length === 0) {
    return NextResponse.json({ checked: 0, fixed: [] });
  }

  const fixed: { id: string; username: string; reason: string }[] = [];

  await Promise.all(
    (sellers as any[]).map(async (seller) => {
      try {
        const account = await stripe.accounts.retrieve(seller.stripe_account_id);
        if (!account.charges_enabled || !account.payouts_enabled) {
          await admin
            .from("profiles")
            .update({ stripe_onboarding_complete: false, role: "buyer" })
            .eq("id", seller.id);

          fixed.push({
            id: seller.id,
            username: seller.username,
            reason: !account.charges_enabled ? "charges_disabled" : "payouts_disabled",
          });
        }
      } catch {
        // If Stripe account can't be retrieved, flag it too
        await admin
          .from("profiles")
          .update({ stripe_onboarding_complete: false, role: "buyer" })
          .eq("id", seller.id);

        fixed.push({ id: seller.id, username: seller.username, reason: "account_not_found" });
      }
    })
  );

  return NextResponse.json({ checked: sellers.length, fixed });
}
