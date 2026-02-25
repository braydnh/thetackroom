import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ArrowRight, ShieldCheck, Truck, Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ListingGrid } from "@/components/listings/ListingGrid";
import { FeaturedListings } from "@/components/listings/FeaturedListings";
import type { ListingCardData } from "@/components/listings/ListingCard";

const CATEGORY_PILLS = [
  { label: "All", href: "/listings" },
  { label: "Saddles", href: "/listings?category=horse&sub=saddles" },
  { label: "Rugs", href: "/listings?category=horse&sub=rugs" },
  { label: "Bridles", href: "/listings?category=horse&sub=bridles" },
  { label: "Boots & Bandages", href: "/listings?category=horse&sub=boots-bandages" },
  { label: "Girths", href: "/listings?category=horse&sub=girths" },
  { label: "Clothing", href: "/listings?category=rider&sub=clothing" },
  { label: "Helmets", href: "/listings?category=rider&sub=helmets-safety" },
  { label: "Footwear", href: "/listings?category=rider&sub=footwear" },
  { label: "Sale & Deals", href: "/listings?category=sale" },
];

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: "Buyer Protection" },
  { icon: Truck, label: "Tracked Delivery" },
  { icon: Star, label: "Verified Sellers" },
];

async function NewestListings() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("listings")
    .select(
      `id, title, price, condition, brand, size, allows_pickup,
       listing_images(display_url, is_primary, sort_order),
       profiles!seller_id(username, avatar_url, is_founding_seller)`
    )
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(12);

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
    };
  });

  if (listings.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-sm text-muted-foreground mb-4">
          Be the first to list your gear
        </p>
        <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
          <Link href="/selling/listings/new">List Your Item</Link>
        </Button>
      </div>
    );
  }

  return <ListingGrid listings={listings} />;
}

export default async function HomePage() {
  return (
    <>
      {/* ── Hero with search ── */}
      <section className="bg-olive">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 sm:py-14">
          {/* Headline */}
          <div className="text-center mb-6">
            <Badge
              className="mb-3 border-cream/20 bg-cream/10 text-cream/80 hover:bg-cream/10"
              variant="outline"
            >
              Now Live in Australia 🇦🇺
            </Badge>
            <h1
              className="text-3xl sm:text-4xl lg:text-5xl font-bold text-cream leading-tight"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Let your gear find its second stride
            </h1>
            <p className="mt-2 text-cream/60 text-sm sm:text-base">
              Australia&apos;s marketplace for pre-loved equestrian equipment
            </p>
          </div>

          {/* Search bar */}
          <form
            action="/listings"
            method="GET"
            className="mx-auto max-w-2xl"
          >
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-4 h-5 w-5 text-muted-foreground" />
              <input
                name="q"
                type="search"
                placeholder="Search saddles, rugs, bridles, helmets…"
                className="w-full rounded-full bg-white py-3.5 pl-12 pr-24 text-sm text-navy placeholder:text-muted-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-cream/40"
                autoComplete="off"
              />
              <button
                type="submit"
                className="absolute right-2 rounded-full bg-olive-light px-5 py-2 text-sm font-medium text-cream hover:bg-olive-dark transition-colors"
              >
                Search
              </button>
            </div>
          </form>

          {/* Quick CTAs */}
          <div className="mt-4 flex justify-center gap-3">
            <Link
              href="/listings"
              className="text-xs text-cream/60 hover:text-cream underline-offset-2 hover:underline"
            >
              Browse all listings
            </Link>
            <span className="text-cream/30">·</span>
            <Link
              href="/selling/listings/new"
              className="text-xs text-cream/60 hover:text-cream underline-offset-2 hover:underline"
            >
              Sell your gear
            </Link>
          </div>
        </div>
      </section>

      {/* ── Category pill strip ── */}
      <div className="sticky top-24 z-40 bg-white border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide py-3">
            {CATEGORY_PILLS.map((pill) => (
              <Link
                key={pill.label}
                href={pill.href}
                className="flex-shrink-0 rounded-full border border-border bg-white px-4 py-1.5 text-sm font-medium text-navy hover:bg-olive hover:text-cream hover:border-olive transition-colors whitespace-nowrap"
              >
                {pill.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* ── Featured Listings ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-8 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2
              className="text-xl font-bold text-navy"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              Featured Listings
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Boost your listing for more exposure
            </p>
          </div>
          <Link
            href="/selling"
            className="text-sm text-olive hover:underline flex items-center gap-1"
          >
            Get featured <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <FeaturedListings slot="homepage" limit={4} showEmpty />
      </section>

      {/* ── Just listed ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-4 pb-12">
        <div className="flex items-center justify-between mb-5">
          <h2
            className="text-xl font-bold text-navy"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Just Listed
          </h2>
          <Link
            href="/listings"
            className="text-sm text-olive hover:underline flex items-center gap-1"
          >
            See all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <NewestListings />
      </section>

      {/* ── Trust strip ── */}
      <section className="border-t border-border bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-10">
            {TRUST_ITEMS.map((item) => (
              <div key={item.label} className="flex items-center gap-2 text-sm text-muted-foreground">
                <item.icon className="h-4 w-4 text-olive flex-shrink-0" />
                {item.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Founding Sellers CTA ── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 py-12">
        <div
          className="rounded-2xl p-8 sm:p-12 text-center"
          style={{ backgroundColor: "#2C3726" }}
        >
          <Badge className="mb-4 border-cream/20 bg-cream/10 text-cream/80" variant="outline">
            Founding Sellers Program
          </Badge>
          <h2
            className="text-2xl sm:text-3xl font-bold text-cream max-w-lg mx-auto"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Be part of something from the beginning
          </h2>
          <p className="mt-3 text-cream/60 text-sm max-w-sm mx-auto">
            Join as a Founding Seller and get early access, a special badge on your profile, and help shape the platform.
          </p>
          <Button
            size="lg"
            className="mt-6 bg-cream text-olive hover:bg-cream/90 font-semibold"
            asChild
          >
            <Link href="/signup?founding=true">Apply Now</Link>
          </Button>
        </div>
      </section>
    </>
  );
}
