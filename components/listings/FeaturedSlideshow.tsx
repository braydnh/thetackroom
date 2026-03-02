"use client";

import { useRef } from "react";
import Link from "next/link";
import { Zap } from "lucide-react";
import { ListingCard, type ListingCardData } from "./ListingCard";

const PLACEHOLDER_COUNT = 8;
// Card width + gap (w-64 + gap-4)
const CARD_STRIDE_PX = 256 + 16;

interface Props {
  listings: ListingCardData[];
}

export function FeaturedSlideshow({ listings }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const isPlaceholder = listings.length === 0;
  const n = isPlaceholder ? PLACEHOLDER_COUNT : listings.length;

  // Need enough cards to fill at least 2× a wide viewport (2 × 1920 = 3840px).
  // Repeats must be EVEN so that –50% translateX always lands on an exact set
  // boundary, keeping the loop perfectly seamless.
  const minRepeats = Math.ceil(3840 / (n * CARD_STRIDE_PX));
  const repeats = minRepeats % 2 === 0 ? minRepeats : minRepeats + 1;

  // Speed: ~80 px/s feels natural for larger cards
  const setWidthPx = n * CARD_STRIDE_PX;
  const halfTrackPx = setWidthPx * (repeats / 2);
  const duration = Math.round(halfTrackPx / 80);

  return (
    <div
      className="relative overflow-hidden"
      style={{
        // Percentage-based fade so cards slide in/out gracefully at any viewport width
        maskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0%, black 12%, black 88%, transparent 100%)",
      }}
      onMouseEnter={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
      }}
      onMouseLeave={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = "running";
      }}
    >
      <div
        ref={trackRef}
        className="flex gap-4 pb-2"
        style={{
          width: "max-content",
          animation: `ambassador-scroll ${duration}s linear infinite`,
        }}
      >
        {Array.from({ length: repeats }).flatMap((_, rep) =>
          isPlaceholder
            ? Array.from({ length: PLACEHOLDER_COUNT }, (__, i) => (
                <Link
                  key={`ph-${rep}-${i}`}
                  href="/selling"
                  className="flex-shrink-0 w-64 group flex flex-col rounded-xl overflow-hidden border-2 border-dashed border-stone-300 bg-white hover:border-olive hover:bg-olive/5 transition-colors"
                >
                  <div className="aspect-square flex flex-col items-center justify-center gap-2">
                    <Zap className="h-5 w-5 text-stone-400 group-hover:text-olive transition-colors" />
                    <span className="text-xs font-medium text-stone-400 group-hover:text-olive transition-colors text-center px-4 leading-tight">
                      Feature your listing here
                    </span>
                  </div>
                  <div className="p-3 border-t border-dashed border-stone-200 flex flex-col gap-2">
                    <div className="h-2.5 w-2/3 rounded bg-stone-100" />
                    <div className="h-2.5 w-1/2 rounded bg-stone-100" />
                  </div>
                </Link>
              ))
            : listings.map((listing, i) => (
                <div key={`${listing.id}-${rep}-${i}`} className="flex-shrink-0 w-64 flex flex-col">
                  <ListingCard listing={listing} featured className="flex-1" />
                </div>
              ))
        )}
      </div>
    </div>
  );
}
