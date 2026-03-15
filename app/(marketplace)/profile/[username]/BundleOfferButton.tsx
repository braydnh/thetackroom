"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Package, Loader2, X, ChevronDown, ChevronUp } from "lucide-react";
import { formatAUD } from "@/lib/utils/currency";
import { toast } from "sonner";

interface Listing {
  id: string;
  title: string;
  price: number;
  primary_image_url: string | null;
}

interface BundleOfferButtonProps {
  sellerId: string;
  sellerUsername: string;
  currentUserId: string | null;
}

export function BundleOfferButton({ sellerId, sellerUsername, currentUserId }: BundleOfferButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loadingListings, setLoadingListings] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [proposedPrice, setProposedPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function openModal() {
    if (!currentUserId) {
      router.push(`/login?next=/profile/${sellerUsername}`);
      return;
    }
    setOpen(true);
    setLoadingListings(true);
    setSelectedIds(new Set());
    setProposedPrice("");
    setNote("");

    const res = await fetch(`/api/bundle-offers/seller-listings?seller_id=${sellerId}`);
    const data = await res.json().catch(() => ({ listings: [] }));
    setListings(data.listings ?? []);
    setLoadingListings(false);
  }

  function toggleListing(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedListings = listings.filter((l) => selectedIds.has(l.id));
  const totalOriginal = selectedListings.reduce((sum, l) => sum + l.price, 0);
  const proposedCents = Math.round(parseFloat(proposedPrice || "0") * 100);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedIds.size < 2) {
      toast.error("Select at least 2 items for a bundle");
      return;
    }
    if (proposedCents < 100) {
      toast.error("Enter a valid bundle price (minimum $1.00)");
      return;
    }

    setSubmitting(true);
    const res = await fetch("/api/bundle-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seller_id: sellerId,
        listing_ids: Array.from(selectedIds),
        proposed_price: proposedCents,
        note: note.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(data.error ?? "Failed to send bundle offer");
      setSubmitting(false);
      return;
    }

    setOpen(false);
    toast.success("Bundle offer sent!");
    router.push(`/messages/${data.conversation_id}`);
  }

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5 flex-shrink-0 border-olive text-olive hover:bg-olive hover:text-cream"
        onClick={openModal}
      >
        <Package className="h-3.5 w-3.5" />
        Bundle Offer
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !submitting && setOpen(false)}
          />

          {/* Modal */}
          <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-semibold text-navy text-base">Send Bundle Offer</h2>
                <p className="text-xs text-muted-foreground mt-0.5">to @{sellerUsername}</p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Listing selector */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <div>
                  <p className="text-xs font-medium text-navy mb-2">
                    Select items to bundle <span className="text-muted-foreground">(minimum 2)</span>
                  </p>

                  {loadingListings ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : listings.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No active listings available.</p>
                  ) : (
                    <div className="space-y-2">
                      {listings.map((listing) => {
                        const selected = selectedIds.has(listing.id);
                        return (
                          <button
                            type="button"
                            key={listing.id}
                            onClick={() => toggleListing(listing.id)}
                            className={`w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                              selected
                                ? "border-olive bg-olive/5"
                                : "border-border hover:border-olive/40"
                            }`}
                          >
                            <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                              {listing.primary_image_url ? (
                                <Image
                                  src={listing.primary_image_url}
                                  alt={listing.title}
                                  width={48}
                                  height={48}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <span className="text-xl opacity-20">🐴</span>
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-navy line-clamp-1">{listing.title}</p>
                              <p className="text-xs text-muted-foreground">{formatAUD(listing.price)}</p>
                            </div>
                            <div className={`h-5 w-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                              selected ? "border-olive bg-olive" : "border-border"
                            }`}>
                              {selected && <span className="text-cream text-[10px] font-bold">✓</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Price + note */}
                {selectedIds.size >= 1 && (
                  <div className="space-y-3 pt-2 border-t border-border">
                    {selectedIds.size >= 1 && totalOriginal > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Combined listing price: <strong className="text-navy">{formatAUD(totalOriginal)}</strong>
                      </p>
                    )}

                    <div>
                      <label className="text-xs font-medium text-navy block mb-1">
                        Your bundle offer price
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={proposedPrice}
                          onChange={(e) => setProposedPrice(e.target.value)}
                          placeholder="0.00"
                          className="w-full rounded-lg border border-border bg-stone-50 pl-7 pr-4 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-medium text-navy block mb-1">
                        Note to seller <span className="font-normal text-muted-foreground">(optional)</span>
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={300}
                        rows={2}
                        placeholder="e.g. I'd love these pieces as a set for my upcoming season…"
                        className="w-full rounded-lg border border-border bg-stone-50 px-3 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex gap-2 px-5 pb-5 pt-3 border-t border-border flex-shrink-0">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => !submitting && setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-olive hover:bg-olive-light text-cream"
                  disabled={submitting || selectedIds.size < 2 || proposedCents < 100}
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Offer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
