"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatAUD } from "@/lib/utils/currency";

export interface AmbassadorListing {
  id: string;
  title: string;
  price: number;
  image: string | null;
  seller_username: string;
  seller_avatar: string | null;
}

interface Props {
  listings: AmbassadorListing[];
}

export function AmbassadorSlideshow({ listings }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  if (listings.length === 0) return null;

  // Duplicate enough times to fill the track seamlessly
  const repeated = listings.length < 6
    ? [...listings, ...listings, ...listings, ...listings]
    : [...listings, ...listings];

  // ~220px per card + 16px gap; animation duration scales with count
  const duration = repeated.length * 3;

  return (
    <div
      className="relative overflow-hidden"
      onMouseEnter={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = "paused";
      }}
      onMouseLeave={() => {
        if (trackRef.current) trackRef.current.style.animationPlayState = "running";
      }}
    >
      {/* fade edges */}
      <div className="pointer-events-none absolute left-0 top-0 h-full w-16 z-10"
        style={{ background: "linear-gradient(to right, #2C3726, transparent)" }} />
      <div className="pointer-events-none absolute right-0 top-0 h-full w-16 z-10"
        style={{ background: "linear-gradient(to left, #2C3726, transparent)" }} />

      <div
        ref={trackRef}
        className="flex gap-4"
        style={{
          width: "max-content",
          animation: `ambassador-scroll ${duration}s linear infinite`,
        }}
      >
        {repeated.map((listing, i) => (
          <Link
            key={`${listing.id}-${i}`}
            href={`/listings/${listing.id}`}
            className="flex-shrink-0 w-48 group"
          >
            {/* Image */}
            <div className="relative h-48 w-48 rounded-xl overflow-hidden bg-black/20">
              {listing.image ? (
                <Image
                  src={listing.image}
                  alt={listing.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                  sizes="192px"
                />
              ) : (
                <div className="h-full w-full flex items-center justify-center">
                  <span className="text-4xl opacity-20">🐴</span>
                </div>
              )}
              {/* Price pill */}
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                {formatAUD(listing.price)}
              </span>
            </div>

            {/* Seller */}
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-cream/20 overflow-hidden flex-shrink-0">
                {listing.seller_avatar ? (
                  <Image
                    src={listing.seller_avatar}
                    alt={listing.seller_username}
                    width={20}
                    height={20}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-[9px] font-bold text-cream">
                    {listing.seller_username[0].toUpperCase()}
                  </span>
                )}
              </div>
              <p className="text-xs text-cream/60 truncate">@{listing.seller_username}</p>
            </div>
            <p className="text-xs text-cream/80 truncate mt-0.5 font-medium">{listing.title}</p>
          </Link>
        ))}
      </div>

      <style>{`
        @keyframes ambassador-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}
