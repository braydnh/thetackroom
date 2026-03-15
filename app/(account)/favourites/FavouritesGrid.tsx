"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { ListingCard } from "@/components/listings/ListingCard";
import type { ListingCardData } from "@/components/listings/ListingCard";

interface FavListing extends ListingCardData {
  status: string;
}

interface Props {
  listings: FavListing[];
  /** listing_ids that are favourited but have no matching listing row (deleted) */
  missingIds: string[];
}

export function FavouritesGrid({ listings: initial, missingIds: initialMissing }: Props) {
  const [listings, setListings] = useState(initial);
  const [missingIds, setMissingIds] = useState(initialMissing);

  async function removeFavourite(listingId: string) {
    await fetch("/api/favourites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id: listingId }),
    });
    setListings((prev) => prev.filter((l) => l.id !== listingId));
    setMissingIds((prev) => prev.filter((id) => id !== listingId));
  }

  const available = listings.filter((l) => l.status === "active" || l.status === "reserved");
  const unavailable = listings.filter((l) => l.status !== "active" && l.status !== "reserved");

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {available.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          showFavourite
          isFavourited
          onFavouriteToggle={removeFavourite}
        />
      ))}

      {unavailable.map((listing) => (
        <SoldCard key={listing.id} title={listing.title} onRemove={() => removeFavourite(listing.id)} />
      ))}

      {missingIds.map((id) => (
        <SoldCard key={id} title="Unavailable listing" onRemove={() => removeFavourite(id)} />
      ))}
    </div>
  );
}

function SoldCard({ title, onRemove }: { title: string; onRemove: () => void }) {
  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden border border-border bg-white opacity-60">
      <div className="relative aspect-square bg-muted flex items-center justify-center">
        <span className="text-4xl opacity-20">🐴</span>
        <span className="absolute top-2 left-2 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
          Sold
        </span>
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white transition-colors"
          aria-label="Remove from favourites"
        >
          <Heart className="h-3.5 w-3.5 fill-red-500 text-red-500" />
        </button>
      </div>
      <div className="p-3">
        <p className="text-sm font-medium text-navy line-clamp-2 leading-snug">{title}</p>
        <button
          onClick={onRemove}
          className="mt-2 text-xs text-muted-foreground hover:text-red-500 transition-colors"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
