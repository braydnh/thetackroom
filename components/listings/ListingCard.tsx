import Link from "next/link";
import { Heart, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatAUDCompact } from "@/lib/utils/currency";
import type { ListingCondition } from "@/types/database.types";
import { cn } from "@/lib/utils";

const CONDITION_LABELS: Record<ListingCondition, { label: string; color: string }> = {
  new_with_tags: { label: "New with tags", color: "bg-emerald-100 text-emerald-800" },
  like_new: { label: "Like new", color: "bg-sky-100 text-sky-800" },
  good: { label: "Good", color: "bg-blue-100 text-blue-800" },
  fair: { label: "Fair", color: "bg-amber-100 text-amber-800" },
  worn: { label: "Well loved", color: "bg-orange-100 text-orange-800" },
};

export interface ListingCardData {
  id: string;
  title: string;
  price: number; // cents
  condition: ListingCondition;
  brand?: string | null;
  size?: string | null;
  allows_pickup: boolean;
  primary_image?: string | null;
  seller_username: string;
  seller_avatar?: string | null;
  seller_is_founding?: boolean;
  favourite_count?: number;
  is_featured?: boolean;
}

interface ListingCardProps {
  listing: ListingCardData;
  /** Show a heart button — pass true when user is logged in */
  showFavourite?: boolean;
  isFavourited?: boolean;
  onFavouriteToggle?: (id: string) => void;
  className?: string;
  /** Render the "Featured" ribbon */
  featured?: boolean;
}

export function ListingCard({
  listing,
  showFavourite = false,
  isFavourited = false,
  onFavouriteToggle,
  className,
  featured = false,
}: ListingCardProps) {
  const cond = CONDITION_LABELS[listing.condition];

  return (
    <div className={cn(
      "group relative flex flex-col rounded-xl overflow-hidden border bg-white hover:shadow-md transition-shadow duration-200",
      featured ? "border-olive/40 ring-1 ring-olive/20" : "border-border",
      className
    )}>
      {/* Image */}
      <Link href={`/listings/${listing.id}`} className="relative block aspect-square overflow-hidden bg-muted">
        {listing.primary_image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.primary_image}
            alt={listing.title}
            className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-stone-100">
            <span className="text-4xl opacity-30">🐴</span>
          </div>
        )}

        {/* Condition badge */}
        <span className={cn("absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium", cond.color)}>
          {cond.label}
        </span>

        {/* Featured badge */}
        {(featured || listing.is_featured) && (
          <span className="absolute top-2 right-8 rounded-full bg-olive/90 px-2 py-0.5 text-[10px] font-semibold text-cream flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" /> Featured
          </span>
        )}

        {/* Favourite button */}
        {showFavourite && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onFavouriteToggle?.(listing.id);
            }}
            className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 backdrop-blur-sm hover:bg-white transition-colors"
            aria-label={isFavourited ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart
              className={cn("h-3.5 w-3.5 transition-colors", isFavourited ? "fill-red-500 text-red-500" : "text-muted-foreground")}
            />
          </button>
        )}

        {/* Local pickup badge */}
        {listing.allows_pickup && (
          <span className="absolute bottom-2 right-2 rounded-full bg-olive/90 px-2 py-0.5 text-[10px] font-medium text-cream">
            Pickup
          </span>
        )}
      </Link>

      {/* Info */}
      <Link href={`/listings/${listing.id}`} className="flex flex-col gap-1 p-3 flex-1">
        {/* Seller */}
        <div className="flex items-center gap-1.5">
          {listing.seller_avatar ? (
            <img src={listing.seller_avatar} alt="" className="h-4 w-4 rounded-full object-cover" />
          ) : (
            <div className="h-4 w-4 rounded-full bg-olive/20 flex items-center justify-center">
              <span className="text-[8px] font-bold text-olive">
                {listing.seller_username[0]?.toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-xs text-muted-foreground truncate">{listing.seller_username}</span>
          {listing.seller_is_founding && (
            <span className="text-[9px] text-olive font-medium">★</span>
          )}
        </div>

        {/* Title */}
        <p className="text-sm font-medium text-navy leading-snug line-clamp-2 flex-1">
          {listing.title}
        </p>

        {/* Brand / size */}
        {(listing.brand || listing.size) && (
          <p className="text-xs text-muted-foreground truncate">
            {[listing.brand, listing.size && `Size ${listing.size}`].filter(Boolean).join(" · ")}
          </p>
        )}

        {/* Price */}
        <p className="mt-1 text-base font-bold text-navy">
          {formatAUDCompact(listing.price)}
        </p>
      </Link>
    </div>
  );
}
