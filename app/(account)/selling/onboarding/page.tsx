"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Banknote, ShieldCheck, Zap, FileText, CreditCard, User, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import { Suspense } from "react";

const BENEFITS = [
  { icon: Banknote, title: "Get paid securely", desc: "Funds transferred directly to your bank after delivery confirmation." },
  { icon: ShieldCheck, title: "Seller protection", desc: "Stripe handles disputes and chargebacks — you're covered." },
  { icon: Zap, title: "Fast payouts", desc: "Money hits your account within 2 business days of a completed sale." },
];

const WHAT_YOU_NEED = [
  { icon: User, label: "Your full legal name and date of birth" },
  { icon: FileText, label: "Your home address" },
  { icon: FileText, label: "Last 4 digits of your Tax File Number (TFN)" },
  { icon: CreditCard, label: "BSB and bank account number" },
];

const FAQ = [
  {
    q: "What type of account should I select?",
    a: "Choose Individual — this is for personal sellers, not businesses. You don't need an ABN or business registration.",
  },
  {
    q: "Why does Stripe ask for my TFN?",
    a: "Australian law requires Stripe to verify your identity. They only ask for the last 4 digits — your full TFN is never stored.",
  },
  {
    q: "What is my 'business' or 'product description'?",
    a: "Enter something like: \"Private seller of second-hand equestrian equipment including saddles, bridles, and riding clothing.\"",
  },
  {
    q: "What website should I enter?",
    a: "Enter tackroomshop.com.au — this is the platform you're selling through.",
  },
  {
    q: "Is my banking information safe?",
    a: "Yes. Stripe is a global payment company used by millions of businesses. The Tack Room never sees your bank details — they go directly to Stripe.",
  },
  {
    q: "I'm under 18 — can I still sell?",
    a: "Yes, but Stripe requires a parent or legal guardian to be the account owner if you're under 18. During Stripe setup, your parent or guardian will need to complete the verification using their own details and bank account.",
  },
];

function OnboardingContent() {
  const searchParams = useSearchParams();
  const isRefresh = searchParams.get("refresh") === "true";
  const [loading, setLoading] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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

      {/* What you'll need */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-navy mb-3">What you'll need</h2>
        <div className="space-y-2">
          {WHAT_YOU_NEED.map((item) => (
            <div key={item.label} className="flex items-center gap-3 text-sm text-muted-foreground">
              <item.icon className="h-4 w-4 text-olive flex-shrink-0" />
              {item.label}
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        <span className="font-semibold">Under 18?</span> A parent or legal guardian must complete the Stripe verification as the account owner using their own details and bank account.
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

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-navy mb-3">Common questions</h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-navy text-left"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                {item.q}
                {openFaq === i ? <ChevronUp className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 flex-shrink-0 text-muted-foreground" />}
              </button>
              {openFaq === i && (
                <div className="px-4 pb-4 text-sm text-muted-foreground">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
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
