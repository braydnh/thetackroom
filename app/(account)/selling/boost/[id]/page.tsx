"use client";

import { useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatAUD } from "@/lib/utils/currency";
import { toast } from "sonner";
import { Loader2, Zap, Home, Search, Check, ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import Link from "next/link";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

const SLOTS = [
  {
    id: "homepage" as const,
    label: "Homepage Feature",
    icon: Home,
    description: "Your listing appears in the featured row on the homepage, seen by every visitor.",
    pricing: { 7: 499, 14: 899 },
  },
  {
    id: "search_top" as const,
    label: "Top of Search",
    icon: Search,
    description: "Your listing is pinned above regular results in the browse/search page.",
    pricing: { 7: 299, 14: 499 },
  },
];

export default function BoostListingPage() {
  const { id: listingId } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const isNew = searchParams.get("new") === "true";
  const [slot, setSlot] = useState<"homepage" | "search_top">("homepage");
  const [duration, setDuration] = useState<7 | 14>(7);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const selectedSlot = SLOTS.find((s) => s.id === slot)!;
  const amount = selectedSlot.pricing[duration];

  async function startPayment() {
    setCreating(true);
    const res = await fetch("/api/stripe/feature-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId, slot, duration_days: duration }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create payment");
      setCreating(false);
      return;
    }
    setClientSecret(data.client_secret);
    setCreating(false);
  }

  if (clientSecret) {
    return (
      <div className="mx-auto max-w-md px-4 py-10">
        <button
          onClick={() => setClientSecret(null)}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <h1
          className="text-2xl font-bold text-navy mb-2"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Complete your Boost
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {selectedSlot.label} · {duration} days · {formatAUD(amount)}
        </p>
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm amount={amount} />
        </Elements>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/selling/listings/${listingId}/edit`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Back to listing
      </Link>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-olive" />
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {isNew ? "Boost Your New Listing" : "Boost Your Listing"}
          </h1>
        </div>
        <Link
          href={`/listings/${listingId}`}
          className="text-sm text-muted-foreground hover:text-navy underline underline-offset-2"
        >
          {isNew ? "Skip for now" : "View listing"}
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        {isNew
          ? "Your listing is live! Get more eyes on it with a paid feature placement."
          : "Get more eyes on your item with a paid feature placement."}
      </p>

      {/* Slot selection */}
      <div className="space-y-3 mb-8">
        <p className="text-sm font-medium text-navy">Choose placement</p>
        {SLOTS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSlot(s.id)}
            className={cn(
              "w-full text-left rounded-xl border-2 p-4 transition-colors",
              slot === s.id ? "border-olive bg-olive/5" : "border-border hover:border-olive/40"
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn(
                "mt-0.5 h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0",
                slot === s.id ? "bg-olive text-cream" : "bg-muted text-muted-foreground"
              )}>
                <s.icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("font-semibold", slot === s.id ? "text-olive" : "text-navy")}>
                    {s.label}
                  </p>
                  {slot === s.id && <Check className="h-4 w-4 text-olive flex-shrink-0" />}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>
                <div className="flex gap-3 mt-2">
                  {([7, 14] as const).map((d) => (
                    <span key={d} className="text-xs text-muted-foreground">
                      {d} days — {formatAUD(s.pricing[d])}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Duration selection */}
      <div className="space-y-3 mb-8">
        <p className="text-sm font-medium text-navy">Duration</p>
        <div className="grid grid-cols-2 gap-3">
          {([7, 14] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDuration(d)}
              className={cn(
                "rounded-xl border-2 p-4 text-center transition-colors",
                duration === d ? "border-olive bg-olive/5" : "border-border hover:border-olive/40"
              )}
            >
              <p className={cn("text-lg font-bold", duration === d ? "text-olive" : "text-navy")}>
                {d} days
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {formatAUD(selectedSlot.pricing[d])}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-olive/5 border border-olive/20 p-4 mb-6">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Placement</span>
          <span className="font-medium text-navy">{selectedSlot.label}</span>
        </div>
        <div className="flex justify-between text-sm mt-1">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium text-navy">{duration} days</span>
        </div>
        <div className="flex justify-between text-base font-bold text-navy border-t border-border mt-3 pt-3">
          <span>Total</span>
          <span className="text-olive">{formatAUD(amount)}</span>
        </div>
      </div>

      <Button
        className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
        onClick={startPayment}
        disabled={creating}
      >
        {creating ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
        ) : (
          <><Zap className="mr-2 h-4 w-4" /> Pay {formatAUD(amount)} &amp; Boost</>
        )}
      </Button>
    </div>
  );
}

function CheckoutForm({ amount }: { amount: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/selling/boost/success`,
      },
    });

    if (error) {
      toast.error(error.message ?? "Payment failed");
      setPaying(false);
    }
    // On success Stripe redirects to return_url
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-border p-4">
        <PaymentElement />
      </div>
      <Button
        type="submit"
        className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
        disabled={paying || !stripe}
      >
        {paying ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
        ) : (
          `Pay ${formatAUD(amount)}`
        )}
      </Button>
    </form>
  );
}
