import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ListingCard, type ListingCardData } from "./ListingCard";
import { Zap } from "lucide-react";

interface FeaturedListingsProps {
  slot: "homepage" | "search_top";
  limit?: number;
  /** IDs to exclude (already shown elsewhere) */
  excludeIds?: string[];
  /** Show placeholder slots when empty (homepage only) */
  showEmpty?: boolean;
}

export async function FeaturedListings({
  slot,
  limit = 4,
  excludeIds = [],
  showEmpty = false,
}: FeaturedListingsProps) {
  const supabase = await createClient();

  const now = new Date().toISOString();

  // Get active featured listing IDs for this slot
  let featuredQuery = supabase
    .from("featured_listings")
    .select("listing_id")
    .eq("slot", slot)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .limit(limit);

  const { data: featuredRows } = await featuredQuery;

  if (!featuredRows || featuredRows.length === 0) {
    if (!showEmpty) return null;
    return <FeaturedEmptySlots count={limit} />;
  }

  const featuredIds = featuredRows
    .map((r: any) => r.listing_id as string)
    .filter((id: string) => !excludeIds.includes(id));
  if (featuredIds.length === 0) {
    if (!showEmpty) return null;
    return <FeaturedEmptySlots count={limit} />;
  }

  // Fetch actual listing data
  const { data: rows } = await supabase
    .from("listings")
    .select(
      `id, title, price, condition, brand, size, allows_pickup,
       listing_images(display_url, is_primary, sort_order),
       profiles!seller_id(username, avatar_url, is_founding_seller, is_ambassador)`
    )
    .in("id", featuredIds)
    .eq("status", "active");

  if (!rows || rows.length === 0) {
    if (!showEmpty) return null;
    return <FeaturedEmptySlots count={limit} />;
  }

  const listings: ListingCardData[] = (rows as any[]).map((r) => {
    const images: { display_url: string; is_primary: boolean; sort_order: number }[] =
      r.listing_images ?? [];
    const sorted = [...images].sort((a, b) => a.sort_order - b.sort_order);
    const primary =
      images.find((i) => i.is_primary)?.display_url ?? sorted[0]?.display_url ?? null;
    const seller = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      title: r.title,
      price: r.price,
      condition: r.condition,
      brand: r.brand,
      size: r.size,
      allows_pickup: r.allows_pickup,
      primary_image: primary,
      images: sorted.map((i) => i.display_url),
      seller_username: seller?.username ?? "unknown",
      seller_avatar: seller?.avatar_url ?? null,
      seller_is_founding: seller?.is_founding_seller ?? false,
      seller_is_ambassador: seller?.is_ambassador ?? false,
      is_featured: true,
    };
  });

  const emptySlots = limit - listings.length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {listings.map((listing) => (
        <ListingCard key={listing.id} listing={listing} featured />
      ))}
      {showEmpty && emptySlots > 0 &&
        Array.from({ length: emptySlots }).map((_, i) => (
          <Link
            key={`empty-${i}`}
            href="/selling"
            className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-white hover:border-olive hover:bg-olive/5 transition-colors aspect-[3/4] text-center px-4"
          >
            <Zap className="h-5 w-5 text-muted-foreground group-hover:text-olive transition-colors" />
            <span className="text-xs font-medium text-muted-foreground group-hover:text-olive transition-colors">
              Feature your listing here
            </span>
          </Link>
        ))
      }
    </div>
  );
}

function FeaturedEmptySlots({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <Link
          key={i}
          href="/selling"
          className="group flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-white hover:border-olive hover:bg-olive/5 transition-colors aspect-[3/4] text-center px-4"
        >
          <Zap className="h-5 w-5 text-muted-foreground group-hover:text-olive transition-colors" />
          <span className="text-xs font-medium text-muted-foreground group-hover:text-olive transition-colors">
            Feature your listing here
          </span>
        </Link>
      ))}
    </div>
  );
}
