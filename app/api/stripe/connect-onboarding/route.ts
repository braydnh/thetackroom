/**
 * POST /api/stripe/connect-onboarding
 *
 * Creates (or retrieves) a Stripe Express account for the seller and
 * returns an onboarding URL. Redirects seller to Stripe's hosted form.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();

    // Get seller's current profile
    const { data: profile } = await admin
      .from("profiles")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("id", user.id)
      .single();

    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    // If already fully onboarded, generate a login link to the Express dashboard
    if (profile.stripe_onboarding_complete && profile.stripe_account_id) {
      const loginLink = await stripe.accounts.createLoginLink(profile.stripe_account_id);
      return NextResponse.json({ url: loginLink.url });
    }

    let accountId = profile.stripe_account_id;

    // Create a new Express account if one doesn't exist
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "AU",
        capabilities: {
          transfers: { requested: true },
          card_payments: { requested: true },
        },
        business_type: "individual",
        metadata: { supabase_user_id: user.id },
      });
      accountId = account.id;

      // Save the account ID to the profile
      await admin
        .from("profiles")
        .update({ stripe_account_id: accountId })
        .eq("id", user.id);
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

    // Create an Account Link for the onboarding flow
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/selling/onboarding?refresh=true`,
      return_url:  `${origin}/selling/onboarding/complete`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error("[connect-onboarding]", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to create Stripe onboarding link" },
      { status: 500 }
    );
  }
}
