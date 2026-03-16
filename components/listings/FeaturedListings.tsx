import { createClient } from "@/lib/supabase/server";
import { type ListingCardData } from "./ListingCard";
import { FeaturedSlideshow } from "./FeaturedSlideshow";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

interface FeaturedListingsProps {
  slot: "homepage" | "search_top";
  /** IDs to exclude (already shown elsewhere) */
  excludeIds?: string[];
  /** Show placeholder carousel when empty (homepage only) */
  showEmpty?: boolean;
  /** Pre-fetched featured listing IDs — skips the featured_listings query */
  preloadedIds?: string[];
}

export async function FeaturedListings({
  slot,
  excludeIds = [],
  showEmpty = false,
  preloadedIds,
}: FeaturedListingsProps) {
  const supabase = await createClient();

  let featuredIds: string[];
  if (preloadedIds !== undefined) {
    featuredIds = preloadedIds.filter((id) => !excludeIds.includes(id));
  } else {
    const now = new Date().toISOString();
    const { data: featuredRows } = await supabase
      .from("featured_listings")
      .select("listing_id")
      .eq("slot", slot)
      .lte("starts_at", now)
      .gt("ends_at", now);
    featuredIds = (featuredRows ?? [])
      .map((r: any) => r.listing_id as string)
      .filter((id: string) => !excludeIds.includes(id));
  }

  if (featuredIds.length === 0) {
    if (!showEmpty) return null;
    return <FeaturedSlideshow listings={[]} />;
  }

  const { data: rows } = await supabase
    .from("listings")
    .select(
      `id, title, price, condition, brand, size, allows_pickup, primary_image_url,
       profiles!seller_id(username, avatar_url, is_founding_seller, is_ambassador)`
    )
    .in("id", featuredIds)
    .eq("status", "active")
    .neq("is_bundle", true);

  if (!rows || rows.length === 0) {
    if (!showEmpty) return null;
    return <FeaturedSlideshow listings={[]} />;
  }

  const listings: ListingCardData[] = (rows as any[]).map((r) => {
    const seller = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      id: r.id,
      title: r.title,
      price: r.price,
      condition: r.condition,
      brand: r.brand,
      size: r.size,
      allows_pickup: r.allows_pickup,
      primary_image: r.primary_image_url ?? null,
      seller_username: seller?.username ?? "unknown",
      seller_avatar: seller?.avatar_url ?? null,
      seller_is_founding: seller?.is_founding_seller ?? false,
      seller_is_ambassador: seller?.is_ambassador ?? false,
      is_featured: true,
    };
  });

  return <FeaturedSlideshow listings={shuffle(listings)} />;
}
