"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, HandCoins, CheckCircle2, XCircle, ArrowLeftRight, ShoppingBag, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

function formatAUD(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

type OfferStatus = "pending" | "accepted" | "declined" | "countered" | "counter_accepted" | "counter_declined" | "expired" | "purchased";

interface ListingOffer {
  id: string;
  listing_id: string;
  buyer_id: string;
  seller_id: string;
  offered_price: number;
  counter_price: number | null;
  accepted_price: number | null;
  note: string | null;
  status: OfferStatus;
  expires_at: string | null;
  listing: {
    id: string;
    title: string;
    price: number;
    primary_image_url: string | null;
    status: string;
  } | null;
  buyer: { username: string; avatar_url: string | null } | null;
}

interface ListingOfferCardProps {
  offerId: string;
  currentUserId: string;
  sellerId: string;
}

export function ListingOfferCard({ offerId, currentUserId, sellerId }: ListingOfferCardProps) {
  const router = useRouter();
  const [offer, setOffer] = useState<ListingOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCounter, setShowCounter] = useState(false);
  const [counterPrice, setCounterPrice] = useState("");

  const isSeller = currentUserId === sellerId;

  useEffect(() => {
    fetch(`/api/listing-offers/${offerId}`)
      .then((r) => r.json())
      .then((data) => setOffer(data.offer ?? null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [offerId]);

  async function doAction(path: string, body?: object) {
    setActionLoading(path);
    const res = await fetch(`/api/listing-offers/${offerId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setActionLoading(null);

    if (!res.ok) {
      toast.error(data.error ?? "Something went wrong");
      return null;
    }
    return data;
  }

  async function handleAccept() {
    const result = await doAction("accept");
    if (result) {
      setOffer((prev) => prev ? { ...prev, status: "accepted", accepted_price: prev.offered_price } : prev);
      toast.success("Offer accepted! Buyer will be notified.");
    }
  }

  async function handleDecline() {
    const result = await doAction("decline");
    if (result) {
      setOffer((prev) => prev ? { ...prev, status: "declined" } : prev);
      toast.success("Offer declined.");
    }
  }

  async function handleCounter(e: React.FormEvent) {
    e.preventDefault();
    const cents = Math.round(parseFloat(counterPrice || "0") * 100);
    if (cents < 100) { toast.error("Enter a valid counter price"); return; }
    const result = await doAction("counter", { counter_price: cents });
    if (result) {
      setOffer((prev) => prev ? { ...prev, status: "countered", counter_price: cents } : prev);
      setShowCounter(false);
      toast.success("Counter offer sent!");
    }
  }

  async function handleAcceptCounter() {
    const result = await doAction("accept-counter");
    if (result) {
      setOffer((prev) => prev ? { ...prev, status: "counter_accepted", accepted_price: prev.counter_price } : prev);
      toast.success("Counter accepted! You can now complete your purchase.");
      if (offer?.listing_id) {
        router.push(`/checkout/${offer.listing_id}?offer=${offerId}`);
      }
    }
  }

  async function handleDeclineCounter() {
    // For buyer declining a counter, we reuse the decline endpoint from buyer's side
    // (we repurpose: buyer calls a separate endpoint or we check buyer_id)
    // Simple: mark as counter_declined
    setActionLoading("decline-counter");
    const res = await fetch(`/api/listing-offers/${offerId}/decline-counter`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setActionLoading(null);
    if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
    setOffer((prev) => prev ? { ...prev, status: "counter_declined" } : prev);
    toast.success("Counter offer declined.");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 flex items-center gap-2 text-sm text-muted-foreground max-w-[320px]">
        <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" /> Loading offer…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground max-w-[320px]">
        Offer unavailable.
      </div>
    );
  }

  const statusConfig: Record<OfferStatus, { label: string; color: string }> = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
    accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Declined", color: "bg-red-100 text-red-700" },
    countered: { label: "Counter Offer", color: "bg-sky-100 text-sky-700" },
    counter_accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
    counter_declined: { label: "Declined", color: "bg-red-100 text-red-700" },
    expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
    purchased: { label: "Purchased", color: "bg-emerald-100 text-emerald-700" },
  };

  const { label, color } = statusConfig[offer.status];

  return (
    <div className="rounded-2xl border border-olive/20 bg-white shadow-sm p-4 max-w-[320px] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <HandCoins className="h-4 w-4 text-olive" />
          <span className="text-sm font-semibold text-navy">Price Offer</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${color}`}>{label}</span>
      </div>

      {/* Listing thumbnail */}
      {offer.listing && (
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {offer.listing.primary_image_url ? (
              <Image src={offer.listing.primary_image_url} alt={offer.listing.title} width={48} height={48} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center"><span className="text-xl opacity-20">🐴</span></div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-navy line-clamp-1">{offer.listing.title}</p>
            <p className="text-xs text-muted-foreground">Listed at {formatAUD(offer.listing.price)}</p>
          </div>
        </div>
      )}

      {/* Price breakdown */}
      <div className="rounded-lg bg-stone-50 border border-border px-3 py-2 space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Buyer offered</span>
          <span className="font-semibold text-olive">{formatAUD(offer.offered_price)}</span>
        </div>
        {offer.status === "countered" && offer.counter_price != null && (
          <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
            <span className="text-muted-foreground">Seller counter</span>
            <span className="font-semibold text-sky-700">{formatAUD(offer.counter_price)}</span>
          </div>
        )}
        {(offer.status === "accepted" || offer.status === "counter_accepted") && offer.accepted_price != null && (
          <div className="flex justify-between text-xs border-t border-border pt-1 mt-1">
            <span className="text-muted-foreground">Agreed price</span>
            <span className="font-semibold text-emerald-700">{formatAUD(offer.accepted_price)}</span>
          </div>
        )}
      </div>

      {/* Note */}
      {offer.note && (
        <p className="text-xs text-navy/70 italic">"{offer.note}"</p>
      )}

      {/* SELLER actions — pending */}
      {isSeller && offer.status === "pending" && !showCounter && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleDecline}
              disabled={!!actionLoading}
            >
              {actionLoading === "decline" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><XCircle className="h-3 w-3 mr-1" />Decline</>}
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8 bg-olive hover:bg-olive-light text-cream"
              onClick={handleAccept}
              disabled={!!actionLoading}
            >
              {actionLoading === "accept" ? <Loader2 className="h-3 w-3 animate-spin" /> : <><CheckCircle2 className="h-3 w-3 mr-1" />Accept</>}
            </Button>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="w-full text-xs h-8"
            onClick={() => setShowCounter(true)}
            disabled={!!actionLoading}
          >
            <ArrowLeftRight className="h-3 w-3 mr-1" />Counter Offer
          </Button>
        </div>
      )}

      {/* SELLER — counter form */}
      {isSeller && offer.status === "pending" && showCounter && (
        <form onSubmit={handleCounter} className="space-y-2">
          <p className="text-xs font-medium text-navy">Your counter price</p>
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              min="1"
              step="0.01"
              value={counterPrice}
              onChange={(e) => setCounterPrice(e.target.value)}
              placeholder="e.g. 95.00"
              autoFocus
              className="w-full rounded-lg border border-border bg-white pl-6 pr-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="outline" className="flex-1 text-xs h-8" onClick={() => setShowCounter(false)} disabled={!!actionLoading}>
              Back
            </Button>
            <Button type="submit" size="sm" className="flex-1 text-xs h-8 bg-olive hover:bg-olive-light text-cream" disabled={!!actionLoading}>
              {actionLoading === "counter" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Send Counter"}
            </Button>
          </div>
        </form>
      )}

      {/* SELLER — countered, waiting */}
      {isSeller && offer.status === "countered" && (
        <p className="text-xs text-sky-700 flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> Counter sent — waiting for buyer's response.
        </p>
      )}

      {/* SELLER — accepted */}
      {isSeller && (offer.status === "accepted" || offer.status === "counter_accepted") && (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" /> Accepted! Buyer has been notified to complete payment.
        </p>
      )}

      {/* BUYER — pending */}
      {!isSeller && offer.status === "pending" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> Awaiting seller response…
        </p>
      )}

      {/* BUYER — counter offer */}
      {!isSeller && offer.status === "countered" && offer.counter_price != null && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-sky-700">The seller made a counter offer of {formatAUD(offer.counter_price)}</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
              onClick={handleDeclineCounter}
              disabled={!!actionLoading}
            >
              {actionLoading === "decline-counter" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Decline"}
            </Button>
            <Button
              size="sm"
              className="flex-1 text-xs h-8 bg-olive hover:bg-olive-light text-cream"
              onClick={handleAcceptCounter}
              disabled={!!actionLoading}
            >
              {actionLoading === "accept-counter" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Accept Counter"}
            </Button>
          </div>
        </div>
      )}

      {/* BUYER — accepted, checkout */}
      {!isSeller && (offer.status === "accepted" || offer.status === "counter_accepted") && offer.accepted_price != null && offer.listing && (
        <Button
          size="sm"
          className="w-full text-xs h-8 bg-olive hover:bg-olive-light text-cream"
          asChild
        >
          <Link href={`/checkout/${offer.listing_id}?offer=${offerId}`}>
            <ShoppingBag className="h-3 w-3 mr-1" />
            Buy Now at {formatAUD(offer.accepted_price)}
          </Link>
        </Button>
      )}

      {/* Declined */}
      {(offer.status === "declined" || offer.status === "counter_declined") && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5" /> This offer was declined.
        </p>
      )}

      {/* Expired */}
      {offer.status === "expired" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" /> This offer has expired.
        </p>
      )}
    </div>
  );
}
