import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAUD } from "@/lib/utils/currency";
import {
  ShieldCheck,
  Truck,
  MapPin,
  Heart,
  Star,
  ChevronLeft,
  Package,
} from "lucide-react";
import { ListingImageGallery } from "@/components/listings/ListingImageGallery";
import { MessageSellerButton } from "@/components/listings/MessageSellerButton";
import { createClient } from "@/lib/supabase/server";

const CONDITION_LABELS: Record<string, string> = {
  new_with_tags: "New with tags",
  like_new: "Like new",
  good: "Good",
  fair: "Fair",
  worn: "Well loved",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("listings")
    .select("title, description")
    .eq("id", id)
    .eq("status", "active")
    .single();

  if (!data) return { title: "Listing not found" };
  return {
    title: `${data.title} — The Tack Room AU`,
    description: data.description?.slice(0, 155) ?? "Pre-loved equestrian gear on The Tack Room AU",
  };
}

export default async function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: rawListing, error } = await supabase
    .from("listings")
    .select(
      `*,
       listing_images(id, display_url, is_primary, sort_order),
       profiles!seller_id(id, username, display_name, avatar_url, location, average_rating, total_sales, is_founding_seller)`
    )
    .eq("id", id)
    .in("status", ["active", "reserved"] as import("@/types/database.types").ListingStatus[])
    .single();

  if (error || !rawListing) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listing = rawListing as any as {
    id: string; title: string; description: string | null; price: number;
    condition: string; category: string; subcategory: string | null;
    brand: string | null; size: string | null; status: string;
    allows_shipping: boolean; allows_pickup: boolean;
    shipping_price: number; shipping_notes: string | null;
    view_count: number;
    listing_images: { id: string; display_url: string; is_primary: boolean; sort_order: number }[];
    profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null; location: string | null; average_rating: number | null; total_sales: number; is_founding_seller: boolean } | null;
  };

  // Increment view count (fire-and-forget, best-effort)
  const currentViewCount = (listing as any).view_count as number ?? 0;
  supabase
    .from("listings")
    .update({ view_count: currentViewCount + 1 })
    .eq("id", id)
    .then(() => {});

  const images: { display_url: string; is_primary: boolean; sort_order: number }[] =
    listing.listing_images ?? [];
  const sortedImages = images
    .sort((a, b) => {
      if (a.is_primary) return -1;
      if (b.is_primary) return 1;
      return a.sort_order - b.sort_order;
    })
    .map((i) => i.display_url);

  const seller = Array.isArray(listing.profiles)
    ? listing.profiles[0]
    : listing.profiles;

  const shippingLabel =
    listing.shipping_price === 0
      ? "Free shipping"
      : `Shipping ${formatAUD(listing.shipping_price)}`;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Back */}
      <Link
        href="/listings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-10">
        {/* Left: images + description */}
        <div className="space-y-8">
          <ListingImageGallery images={sortedImages} title={listing.title} />

          {/* Description */}
          <div>
            <h2 className="font-semibold text-navy mb-3">Description</h2>
            <p className="text-sm text-navy/80 leading-relaxed whitespace-pre-wrap">
              {listing.description}
            </p>
          </div>

          {/* Details table */}
          <div>
            <h2 className="font-semibold text-navy mb-3">Item Details</h2>
            <div className="rounded-xl border border-border overflow-hidden">
              {(
                [
                  { label: "Condition", value: CONDITION_LABELS[listing.condition] ?? listing.condition },
                  listing.brand ? { label: "Brand", value: listing.brand } : null,
                  listing.size ? { label: "Size", value: listing.size } : null,
                  { label: "Category", value: listing.subcategory ?? listing.category },
                ] as ({ label: string; value: string } | null)[]
              )
                .filter(Boolean)
                .map((row, i, arr) => (
                  <div
                    key={row!.label}
                    className={`flex justify-between px-4 py-3 text-sm ${
                      i < arr.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <span className="text-muted-foreground">{row!.label}</span>
                    <span className="font-medium text-navy capitalize">{row!.value}</span>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Right: purchase card */}
        <div className="space-y-5">
          {/* Price + title */}
          <div>
            <p className="text-3xl font-bold text-navy">{formatAUD(listing.price)}</p>
            <h1
              className="text-xl font-semibold text-navy mt-1"
              style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
            >
              {listing.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge
                variant="outline"
                className="text-xs border-muted-foreground/30 text-muted-foreground"
              >
                {CONDITION_LABELS[listing.condition]}
              </Badge>
              {listing.brand && (
                <Badge
                  variant="outline"
                  className="text-xs border-muted-foreground/30 text-muted-foreground"
                >
                  {listing.brand}
                </Badge>
              )}
            </div>
          </div>

          {/* Seller card */}
          {seller && (
            <div className="rounded-xl border border-border p-4 flex items-center gap-3">
              {seller.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={seller.avatar_url}
                  className="h-11 w-11 rounded-full object-cover"
                  alt=""
                />
              ) : (
                <div className="h-11 w-11 rounded-full bg-olive/20 flex items-center justify-center">
                  <span className="text-sm font-bold text-olive">
                    {seller.username[0]?.toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Link
                    href={`/profile/${seller.username}`}
                    className="font-medium text-navy hover:underline text-sm"
                  >
                    {seller.display_name ?? seller.username}
                  </Link>
                  {seller.is_founding_seller && (
                    <span className="rounded-full bg-olive px-1.5 py-0.5 text-[10px] font-medium text-cream flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5" /> Founding Seller
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {seller.total_sales} sales
                  {seller.average_rating
                    ? ` · ${Number(seller.average_rating).toFixed(1)} ★`
                    : ""}
                  {seller.location ? ` · ${seller.location}` : ""}
                </p>
              </div>
            </div>
          )}

          {/* Delivery options */}
          <div className="rounded-xl border border-border p-4 space-y-3">
            {listing.allows_shipping && (
              <div className="flex items-start gap-3 text-sm">
                <Truck className="h-4 w-4 text-olive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-navy">{shippingLabel}</p>
                  {listing.shipping_notes && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {listing.shipping_notes}
                    </p>
                  )}
                </div>
              </div>
            )}
            {listing.allows_pickup && (
              <div className="flex items-start gap-3 text-sm">
                <MapPin className="h-4 w-4 text-olive mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-navy">Local pickup available</p>
                  {seller?.location && (
                    <p className="text-xs text-muted-foreground mt-0.5">{seller.location}</p>
                  )}
                </div>
              </div>
            )}
            {!listing.allows_shipping && !listing.allows_pickup && (
              <p className="text-sm text-muted-foreground">Delivery method TBC — message the seller.</p>
            )}
          </div>

          {/* Buyer protection */}
          <div className="rounded-xl bg-olive/5 border border-olive/20 p-4 flex items-start gap-3">
            <ShieldCheck className="h-4 w-4 text-olive mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-navy">Buyer Protection</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Payment is held securely and only released to the seller once your item is
                delivered.
              </p>
            </div>
          </div>

          {/* CTAs */}
          {listing.status === "active" ? (
            <div className="space-y-3">
              <Button
                className="w-full bg-olive hover:bg-olive-light text-cream text-base h-12"
                asChild
              >
                <Link href={`/checkout/${listing.id}`}>
                  <Package className="mr-2 h-4 w-4" />
                  Buy Now —{" "}
                  {formatAUD(
                    listing.price + (listing.allows_shipping ? listing.shipping_price : 0)
                  )}
                </Link>
              </Button>
              <div className="grid grid-cols-2 gap-3">
                {seller && (
                  <MessageSellerButton sellerId={seller.id} listingId={listing.id} />
                )}
                <Button variant="outline" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Save
                </Button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                This item is no longer available.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
