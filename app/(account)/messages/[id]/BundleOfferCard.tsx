"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, Package, CheckCircle2, XCircle, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function formatAUD(cents: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(cents / 100);
}

interface OfferListing {
  id: string;
  title: string;
  price: number;
  primary_image_url: string | null;
  status: string;
}

interface BundleOffer {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_ids: string[];
  proposed_price: number;
  note: string | null;
  status: "pending" | "accepted" | "declined" | "expired" | "purchased";
  final_price: number | null;
  shipping_price: number | null;
  bundle_listing_id: string | null;
  listings: OfferListing[];
  buyer: { username: string; avatar_url: string | null };
}

interface BundleOfferCardProps {
  offerId: string;
  currentUserId: string;
  sellerId: string;
}

export function BundleOfferCard({ offerId, currentUserId, sellerId }: BundleOfferCardProps) {
  const [offer, setOffer] = useState<BundleOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showAcceptForm, setShowAcceptForm] = useState(false);
  const [finalPrice, setFinalPrice] = useState("");
  const [shippingPrice, setShippingPrice] = useState("");

  const isSeller = currentUserId === sellerId;

  useEffect(() => {
    fetch(`/api/bundle-offers/${offerId}`)
      .then((r) => r.json())
      .then((data) => {
        setOffer(data.offer ?? null);
        if (data.offer?.final_price) {
          setFinalPrice(String(data.offer.final_price / 100));
        }
        if (data.offer?.shipping_price != null) {
          setShippingPrice(String(data.offer.shipping_price / 100));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [offerId]);

  async function handleAccept(e: React.FormEvent) {
    e.preventDefault();
    const finalCents = Math.round(parseFloat(finalPrice || "0") * 100);
    const shippingCents = Math.round(parseFloat(shippingPrice || "0") * 100);

    if (finalCents < 100) { toast.error("Enter a valid price"); return; }
    if (shippingCents < 0) { toast.error("Invalid shipping price"); return; }

    setAccepting(true);
    const res = await fetch(`/api/bundle-offers/${offerId}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ final_price: finalCents, shipping_price: shippingCents }),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(data.error ?? "Failed to accept offer");
      setAccepting(false);
      return;
    }

    setOffer((prev) => prev ? { ...prev, status: "accepted", bundle_listing_id: data.bundle_listing_id } : prev);
    setShowAcceptForm(false);
    toast.success("Bundle created! Buyer has been notified.");
  }

  async function handleDecline() {
    setDeclining(true);
    const res = await fetch(`/api/bundle-offers/${offerId}/decline`, { method: "POST" });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(data.error ?? "Failed to decline offer");
      setDeclining(false);
      return;
    }

    setOffer((prev) => prev ? { ...prev, status: "declined" } : prev);
    toast.success("Offer declined.");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading bundle offer…
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted-foreground">
        Bundle offer unavailable.
      </div>
    );
  }

  const statusConfig = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700" },
    accepted: { label: "Accepted", color: "bg-emerald-100 text-emerald-700" },
    declined: { label: "Declined", color: "bg-red-100 text-red-700" },
    expired: { label: "Expired", color: "bg-muted text-muted-foreground" },
    purchased: { label: "Purchased", color: "bg-emerald-100 text-emerald-700" },
  };

  const statusInfo = statusConfig[offer.status];

  return (
    <div className="rounded-2xl border border-olive/30 bg-olive/5 p-4 max-w-[340px] space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Package className="h-4 w-4 text-olive" />
          <span className="text-sm font-semibold text-navy">Bundle Offer</span>
        </div>
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      </div>

      {/* Listing thumbnails */}
      <div className="flex gap-1.5 flex-wrap">
        {offer.listings.slice(0, 4).map((listing) => (
          <div key={listing.id} className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {listing.primary_image_url ? (
              <Image
                src={listing.primary_image_url}
                alt={listing.title}
                width={56}
                height={56}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center">
                <span className="text-xl opacity-20">🐴</span>
              </div>
            )}
          </div>
        ))}
        {offer.listings.length > 4 && (
          <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
            <span className="text-xs text-muted-foreground font-medium">+{offer.listings.length - 4}</span>
          </div>
        )}
      </div>

      {/* Item titles */}
      <div className="space-y-0.5">
        {offer.listings.map((l) => (
          <p key={l.id} className="text-xs text-navy/70 line-clamp-1">• {l.title}</p>
        ))}
      </div>

      {/* Price */}
      <div className="rounded-lg bg-white border border-border px-3 py-2 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Combined listing price</span>
          <span className="font-medium text-navy">
            {formatAUD(offer.listings.reduce((s, l) => s + l.price, 0))}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Proposed bundle price</span>
          <span className="font-semibold text-olive">{formatAUD(offer.proposed_price)}</span>
        </div>
        {offer.status === "accepted" && offer.final_price != null && (
          <div className="flex items-center justify-between text-xs border-t border-border pt-1 mt-1">
            <span className="text-muted-foreground">Final price + shipping</span>
            <span className="font-semibold text-emerald-700">
              {formatAUD(offer.final_price)} + {formatAUD(offer.shipping_price ?? 0)} shipping
            </span>
          </div>
        )}
      </div>

      {/* Note */}
      {offer.note && (
        <p className="text-xs text-navy/70 italic">"{offer.note}"</p>
      )}

      {/* Seller actions (pending) */}
      {isSeller && offer.status === "pending" && !showAcceptForm && (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 text-xs h-8 border-red-200 text-red-600 hover:bg-red-50"
            onClick={handleDecline}
            disabled={declining}
          >
            {declining ? <Loader2 className="h-3 w-3 animate-spin" /> : <><XCircle className="h-3 w-3 mr-1" />Decline</>}
          </Button>
          <Button
            size="sm"
            className="flex-1 text-xs h-8 bg-olive hover:bg-olive-light text-cream"
            onClick={() => setShowAcceptForm(true)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />Accept & Create Bundle
          </Button>
        </div>
      )}

      {/* Accept form (seller sets final price + shipping) */}
      {isSeller && offer.status === "pending" && showAcceptForm && (
        <form onSubmit={handleAccept} className="space-y-2">
          <p className="text-xs font-medium text-navy">Set final price & shipping</p>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Bundle price ($)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  value={finalPrice}
                  onChange={(e) => setFinalPrice(e.target.value)}
                  placeholder={String(offer.proposed_price / 100)}
                  className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-olive/40"
                />
              </div>
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground block mb-1">Shipping ($)</label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={shippingPrice}
                  onChange={(e) => setShippingPrice(e.target.value)}
                  placeholder="0.00"
                  className="w-full rounded-lg border border-border bg-white pl-6 pr-2 py-2 text-xs text-navy focus:outline-none focus:ring-2 focus:ring-olive/40"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="flex-1 text-xs h-8"
              onClick={() => setShowAcceptForm(false)}
              disabled={accepting}
            >
              Back
            </Button>
            <Button
              type="submit"
              size="sm"
              className="flex-1 text-xs h-8 bg-olive hover:bg-olive-light text-cream"
              disabled={accepting}
            >
              {accepting ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm & Create"}
            </Button>
          </div>
        </form>
      )}

      {/* Accepted — buyer sees purchase link */}
      {!isSeller && offer.status === "accepted" && offer.bundle_listing_id && (
        <Button
          size="sm"
          className="w-full text-xs h-8 bg-olive hover:bg-olive-light text-cream"
          asChild
        >
          <Link href={`/listings/${offer.bundle_listing_id}`}>
            <ShoppingBag className="h-3 w-3 mr-1" />
            View & Purchase Bundle
          </Link>
        </Button>
      )}

      {/* Accepted — seller confirmation */}
      {isSeller && offer.status === "accepted" && (
        <p className="text-xs text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Bundle listing created — buyer has been notified.
        </p>
      )}

      {/* Declined */}
      {offer.status === "declined" && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <XCircle className="h-3.5 w-3.5" />
          This offer was declined.
        </p>
      )}
    </div>
  );
}

// Card shown when a bundle has been accepted (shows in the thread as a follow-up message)
interface BundleAcceptedCardProps {
  listingId: string;
  isSeller: boolean;
}

export function BundleAcceptedCard({ listingId, isSeller }: BundleAcceptedCardProps) {
  if (isSeller) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 max-w-[280px]">
        <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
          <CheckCircle2 className="h-4 w-4" />
          Bundle listing created! Buyer has been notified.
        </p>
      </div>
    );
  }
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 max-w-[280px] space-y-2">
      <p className="text-xs font-medium text-emerald-700 flex items-center gap-1.5">
        <CheckCircle2 className="h-4 w-4" />
        Your bundle offer was accepted!
      </p>
      <Button size="sm" className="w-full text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white" asChild>
        <Link href={`/listings/${listingId}`}>
          <ShoppingBag className="h-3 w-3 mr-1" />
          Purchase Bundle
        </Link>
      </Button>
    </div>
  );
}

export function BundleDeclinedCard() {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-3 max-w-[280px]">
      <p className="text-xs font-medium text-red-600 flex items-center gap-1.5">
        <XCircle className="h-4 w-4" />
        Bundle offer was declined.
      </p>
    </div>
  );
}
