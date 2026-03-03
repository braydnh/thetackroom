import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function OnboardingCompletePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_onboarding_complete")
    .eq("id", user.id)
    .single();

  // If Stripe says not yet complete, show a pending message
  if (!profile?.stripe_onboarding_complete) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center">
          <span className="text-3xl">⏳</span>
        </div>
        <h1
          className="text-2xl font-bold text-navy mb-2"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Almost there
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          Stripe is still verifying your account. This usually takes a few minutes.
          Check back shortly.
        </p>
        <div className="flex flex-col gap-3">
          <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
            <Link href="/selling">Go to my dashboard</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/selling/onboarding">Try connecting again</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-olive/10 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-olive" />
      </div>
      <h1
        className="text-2xl font-bold text-navy mb-2"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        You&apos;re ready to sell!
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Your bank account is connected. List your first item and start earning.
      </p>
      <div className="flex flex-col gap-3">
        <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
          <Link href="/selling/listings/new">List your first item</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/selling">View my dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
