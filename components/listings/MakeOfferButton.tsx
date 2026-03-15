"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HandCoins, Loader2, X } from "lucide-react";
import { formatAUD } from "@/lib/utils/currency";
import { toast } from "sonner";

interface MakeOfferButtonProps {
  listingId: string;
  sellerId: string;
  listingPrice: number; // in cents
  currentUserId: string | null;
}

export function MakeOfferButton({ listingId, sellerId, listingPrice, currentUserId }: MakeOfferButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleOpen() {
    if (!currentUserId) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }
    setOpen(true);
  }

  const offerCents = Math.round(parseFloat(offerPrice || "0") * 100);
  const savings = listingPrice - offerCents;
  const savingsPct = listingPrice > 0 ? Math.round((savings / listingPrice) * 100) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (offerCents < 100) { toast.error("Enter a valid offer (minimum $1.00)"); return; }
    if (offerCents >= listingPrice) { toast.error("Offer must be less than the listing price"); return; }

    setSubmitting(true);
    const res = await fetch("/api/listing-offers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: listingId,
        offered_price: offerCents,
        note: note.trim() || undefined,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(data.error ?? "Failed to send offer");
      setSubmitting(false);
      return;
    }

    setOpen(false);
    toast.success("Offer sent! You'll be notified when the seller responds.");
    router.push(`/messages/${data.conversation_id}`);
  }

  return (
    <>
      <Button
        variant="outline"
        className="w-full border-olive text-olive hover:bg-olive hover:text-cream gap-2"
        onClick={handleOpen}
      >
        <HandCoins className="h-4 w-4" />
        Make an Offer
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => !submitting && setOpen(false)} />

          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
              <div>
                <h2 className="font-semibold text-navy text-base">Make an Offer</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Listed at <strong>{formatAUD(listingPrice)}</strong>
                </p>
              </div>
              <button
                onClick={() => !submitting && setOpen(false)}
                className="rounded-full p-1.5 hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
              {/* Price input */}
              <div>
                <label className="text-xs font-medium text-navy block mb-1.5">Your offer price</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">$</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={offerPrice}
                    onChange={(e) => setOfferPrice(e.target.value)}
                    placeholder="0.00"
                    autoFocus
                    className="w-full rounded-xl border border-border bg-stone-50 pl-7 pr-4 py-3 text-lg font-semibold text-navy placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-olive/40"
                  />
                </div>

                {offerCents >= 100 && offerCents < listingPrice && (
                  <p className="text-xs text-emerald-600 mt-1.5">
                    {savingsPct}% off — saving {formatAUD(savings)}
                  </p>
                )}
                {offerCents >= listingPrice && offerCents > 0 && (
                  <p className="text-xs text-destructive mt-1.5">
                    Offer must be less than {formatAUD(listingPrice)}
                  </p>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-medium text-navy block mb-1.5">
                  Message to seller <span className="font-normal text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={300}
                  rows={2}
                  placeholder="e.g. I'm very interested — happy to arrange pickup!"
                  className="w-full rounded-xl border border-border bg-stone-50 px-3 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40 resize-none"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                The seller will have 48 hours to accept, decline, or counter your offer. No payment is taken until the offer is accepted.
              </p>

              <div className="flex gap-2 pt-1">
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
                  disabled={submitting || offerCents < 100 || offerCents >= listingPrice}
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
