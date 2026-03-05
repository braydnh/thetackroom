import { Suspense } from "react";
import Link from "next/link";
import { FilterSidebar } from "@/components/listings/FilterSidebar";
import { SortSelect } from "@/components/listings/SortSelect";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { FeaturedListings } from "@/components/listings/FeaturedListings";
import type { ListingCardData } from "@/components/listings/ListingCard";
import type { ListingCondition, ListingCategory } from "@/types/database.types";
import { expandSubValues } from "@/lib/categories";

const CATEGORY_PILLS = [
  { label: "All", href: "/listings" },
  { label: "Saddles", href: "/listings?category=horse&sub=saddles" },
  { label: "Rugs", href: "/listings?category=horse&sub=rugs" },
  { label: "Bridles", href: "/listings?category=horse&sub=bridles" },
  { label: "Boots & Bandages", href: "/listings?category=horse&sub=boots-bandages" },
  { label: "Girths", href: "/listings?category=horse&sub=girths" },
  { label: "Women's", href: "/listings?category=rider&sub=womens-clothing" },
  { label: "Men's", href: "/listings?category=rider&sub=mens-clothing" },
  { label: "Helmets", href: "/listings?category=rider&sub=helmets-safety" },
  { label: "Women's Footwear", href: "/listings?category=rider&sub=womens-footwear" },
  { label: "Men's Footwear", href: "/listings?category=rider&sub=mens-footwear" },
  { label: "Under $100", href: "/listings?max=100" },
];

interface SearchParams {
  q?: string;
  category?: string;
  sub?: string | string[];
  condition?: string | string[];
  min?: string;
  max?: string;
  sort?: string;
  page?: string;
}

function buildTitle(params: SearchParams): string {
  if (params.q) return `"${params.q}"`;
  if (params.category === "horse") return "Horse";
  if (params.category === "rider") return "Rider";
  if (params.category === "stable") return "Stable";
  return "All Listings";
}

export default async function ListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;

  // Fetch featured listing IDs so we can exclude them from the regular grid
  let featuredIds: string[] = [];
  const showFeatured = !params.q && !params.condition && !params.min && !params.max;
  if (showFeatured) {
    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data: featuredRows } = await supabase
      .from("featured_listings")
      .select("listing_id")
      .eq("slot", "search_top")
      .lte("starts_at", now)
      .gt("ends_at", now)
      .limit(4);
    featuredIds = featuredRows?.map((r: any) => r.listing_id as string) ?? [];
  }

  return (
    <div>
      {/* Category pill strip */}
      <div className="border-b border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {CATEGORY_PILLS.map((pill) => {
              const isActive =
                pill.href === "/listings"
                  ? !params.category && !params.sub && !params.max
                  : pill.href === "/listings?max=100"
                  ? params.max === "100" && !params.category
                  : pill.href === `/listings?category=${params.category}&sub=${params.sub}` ||
                    pill.href === `/listings?category=${params.category}`;
              return (
                <Link
                  key={pill.label}
                  href={pill.href}
                  className={`flex-shrink-0 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-olive text-cream border-olive"
                      : "bg-white text-navy border-border hover:bg-olive hover:text-cream hover:border-olive"
                  }`}
                >
                  {pill.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            {buildTitle(params)}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Pre-loved equestrian gear</p>
        </div>
        {/* Sort */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Sort:</span>
          <Suspense>
            <SortSelect current={params.sort} />
          </Suspense>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Sidebar — hidden on mobile, shown via sheet */}
        <div className="hidden lg:block w-48 flex-shrink-0">
          <Suspense>
            <FilterSidebar />
          </Suspense>
        </div>

        {/* Grid */}
        <div className="flex-1 min-w-0">
          {/* Mobile: filter button */}
          <div className="flex lg:hidden items-center justify-between mb-4">
            <MobileFilterButton />
            <Suspense>
              <SortSelect current={params.sort} />
            </Suspense>
          </div>

          {/* Featured pinned results — only shown when no search/filter active */}
          {showFeatured && (
            <div className="mb-8">
              <Suspense fallback={null}>
                <FeaturedListings slot="search_top" />
              </Suspense>
            </div>
          )}

          <Suspense fallback={<ListingGrid listings={[]} loading />}>
            <ListingsContent params={params} excludeIds={featuredIds} />
          </Suspense>
        </div>
      </div>
      </div>
    </div>
  );
}


function MobileFilterButton() {
  return (
    <Button variant="outline" size="sm" className="gap-2">
      <SlidersHorizontal className="h-4 w-4" />
      Filters
    </Button>
  );
}

async function ListingsContent({ params, excludeIds = [] }: { params: SearchParams; excludeIds?: string[] }) {
  const supabase = await createClient();

  let query = supabase
    .from("listings")
    .select(
      `id, title, price, condition, brand, size, allows_pickup,
       listing_images(display_url, is_primary, sort_order),
       profiles!seller_id(username, avatar_url, is_founding_seller, is_ambassador)`
    )
    .eq("status", "active");

  // Exclude featured listings already shown above
  if (excludeIds.length > 0) {
    query = query.not("id", "in", `(${excludeIds.join(",")})`);
  }

  // Filters
  if (params.category) {
    query = query.eq("category", params.category as ListingCategory);
  }

  const rawSubs = params.sub
    ? Array.isArray(params.sub) ? params.sub : [params.sub]
    : [];
  const subs = rawSubs.length > 0 ? expandSubValues(rawSubs) : [];
  if (subs.length === 1) {
    query = query.eq("subcategory", subs[0]);
  } else if (subs.length > 1) {
    query = query.in("subcategory", subs);
  }

  const conditions = params.condition
    ? Array.isArray(params.condition) ? params.condition : [params.condition]
    : [];
  if (conditions.length > 0) {
    query = query.in("condition", conditions as ListingCondition[]);
  }

  if (params.min) query = query.gte("price", Math.round(parseFloat(params.min) * 100));
  if (params.max) query = query.lte("price", Math.round(parseFloat(params.max) * 100));

  if (params.q) {
    query = query.textSearch("search_vector", params.q, { type: "websearch" });
  }

  // Sort
  if (params.sort === "price_asc") {
    query = query.order("price", { ascending: true });
  } else if (params.sort === "price_desc") {
    query = query.order("price", { ascending: false });
  } else {
    query = query.order("created_at", { ascending: false });
  }

  query = query.limit(24);

  const { data: rows } = await query;

  const listings: ListingCardData[] = (rows ?? []).map((r: any) => {
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
    };
  });

  return (
    <ListingGrid
      listings={listings}
      emptyMessage={
        params.q || params.category || params.condition
          ? "No listings match your filters."
          : "No listings yet — be the first to list your gear!"
      }
    />
  );
}
