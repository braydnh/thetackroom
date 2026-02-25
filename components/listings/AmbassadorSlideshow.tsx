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

// Shown when no ambassador listings exist yet
const PLACEHOLDERS: AmbassadorListing[] = [
  { id: "#", title: "Wintec 500 Close Contact Saddle", price: 42000, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Eskadron Classic Sports Rug", price: 8500, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Charles Owen GR8 Helmet", price: 18000, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Stubben Jumping Bridle", price: 12000, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Mountain Horse Tall Boot", price: 9500, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Horze Dressage Saddle Pad", price: 3500, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Bucas Freedom Turnout 300g", price: 15000, image: null, seller_username: "ambassador", seller_avatar: null },
  { id: "#", title: "Pessoa Alpha Pro Boots", price: 7000, image: null, seller_username: "ambassador", seller_avatar: null },
];

const PLACEHOLDER_GRADIENTS = [
  "linear-gradient(135deg, #3d4f32 0%, #2C3726 100%)",
  "linear-gradient(135deg, #2a3558 0%, #1a2340 100%)",
  "linear-gradient(135deg, #4a5e35 0%, #3d4f32 100%)",
  "linear-gradient(135deg, #1e2619 0%, #2C3726 100%)",
  "linear-gradient(135deg, #2a3558 0%, #3d4f32 100%)",
  "linear-gradient(135deg, #3d4f32 0%, #1a2340 100%)",
  "linear-gradient(135deg, #4a5e35 0%, #1e2619 100%)",
  "linear-gradient(135deg, #1a2340 0%, #3d4f32 100%)",
];

interface Props {
  listings: AmbassadorListing[];
}

export function AmbassadorSlideshow({ listings }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  const source = listings.length > 0 ? listings : PLACEHOLDERS;
  const isPlaceholder = listings.length === 0;

  // Duplicate enough times to fill the track seamlessly
  const repeated = source.length < 6
    ? [...source, ...source, ...source, ...source]
    : [...source, ...source];

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
      {/* Fade edges */}
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
            href={isPlaceholder ? "#" : `/listings/${listing.id}`}
            className="flex-shrink-0 w-48 group"
            onClick={isPlaceholder ? (e) => e.preventDefault() : undefined}
          >
            {/* Image */}
            <div
              className="relative h-48 w-48 rounded-xl overflow-hidden"
              style={{ background: PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length] }}
            >
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
                  <span className="text-5xl opacity-30">🐴</span>
                </div>
              )}
              {/* Price pill */}
              <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                {formatAUD(listing.price)}
              </span>
            </div>

            {/* Seller */}
            <div className="mt-2 flex items-center gap-1.5">
              <div className="h-5 w-5 rounded-full bg-cream/20 overflow-hidden flex-shrink-0 flex items-center justify-center">
                {listing.seller_avatar ? (
                  <Image
                    src={listing.seller_avatar}
                    alt={listing.seller_username}
                    width={20}
                    height={20}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-[9px] font-bold text-cream">
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
    </div>
  );
}
