"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Banknote, ShieldCheck, Zap } from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";

const BENEFITS = [
  { icon: Banknote, title: "Get paid securely", desc: "Funds transferred directly to your bank after delivery confirmation." },
  { icon: ShieldCheck, title: "Seller protection", desc: "Stripe handles disputes and chargebacks — you're covered." },
  { icon: Zap, title: "Fast payouts", desc: "Money hits your account within 2 business days of a completed sale." },
];

function OnboardingContent() {
  const searchParams = useSearchParams();
  const isRefresh = searchParams.get("refresh") === "true";
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isRefresh) toast.info("Your session expired — please start again.");
  }, [isRefresh]);

  async function startOnboarding() {
    setLoading(true);
    const res = await fetch("/api/stripe/connect-onboarding", { method: "POST" });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    if (data.already_complete) {
      window.location.href = "/selling";
      return;
    }

    window.location.href = data.url;
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="text-center mb-8">
        <div className="mx-auto mb-4 h-14 w-14 rounded-full bg-olive/10 flex items-center justify-center">
          <Banknote className="h-7 w-7 text-olive" />
        </div>
        <h1
          className="text-2xl font-bold text-navy mb-2"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Set up your seller account
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your bank account via Stripe to start selling. Takes about 3 minutes.
        </p>
      </div>

      {/* Benefits */}
      <div className="space-y-3 mb-8">
        {BENEFITS.map((b) => (
          <div key={b.title} className="flex items-start gap-3 rounded-xl border border-border p-4">
            <div className="h-9 w-9 rounded-full bg-olive/10 flex items-center justify-center flex-shrink-0">
              <b.icon className="h-4.5 w-4.5 text-olive" />
            </div>
            <div>
              <p className="text-sm font-semibold text-navy">{b.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{b.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <Button
        className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
        onClick={startOnboarding}
        disabled={loading}
      >
        {loading ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Redirecting to Stripe…</>
        ) : (
          "Connect bank account"
        )}
      </Button>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        Powered by Stripe · Your banking details are never shared with The Tack Room
      </p>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse" />}>
      <OnboardingContent />
    </Suspense>
  );
}
