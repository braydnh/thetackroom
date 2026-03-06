/**
 * GET /api/stripe/connect-return
 *
 * Called when a seller returns from Stripe's onboarding form.
 * Checks the account's charges_enabled status and updates the profile.
 * Stripe also sends account.updated webhooks; this is a fast immediate check.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/login`);
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("stripe_account_id")
    .eq("id", user.id)
    .single();

  if (profile?.stripe_account_id) {
    const account = await stripe.accounts.retrieve(profile.stripe_account_id);
    if (account.charges_enabled && account.payouts_enabled) {
      await admin
        .from("profiles")
        .update({ stripe_onboarding_complete: true, role: "seller" })
        .eq("id", user.id);
    }
  }

  return NextResponse.redirect(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/selling/onboarding/complete`
  );
}
