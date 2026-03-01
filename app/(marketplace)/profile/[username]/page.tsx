import { notFound } from "next/navigation";
import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatAUD } from "@/lib/utils/currency";
import { Star, Package, ShoppingBag, Pencil } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }): Promise<Metadata> {
  const { username } = await params;
  return { title: `@${username} — The Tack Room AU` };
}

export default async function SellerProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const admin = createAdminClient();

  const [{ data: profile }, supabase] = await Promise.all([
    admin
      .from("profiles")
      .select("id, username, display_name, bio, avatar_url, location, average_rating, total_sales, is_founding_seller, is_ambassador, created_at")
      .eq("username", username)
      .single(),
    createClient(),
  ]);

  if (!profile) notFound();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  const isOwnProfile = currentUser?.id === (profile as any).id;

  // Load active listings, sold listings, and recent reviews in parallel
  const [{ data: listings }, { data: soldListings }, { data: reviews }] = await Promise.all([
    admin
      .from("listings")
      .select("id, title, price, condition, brand, listing_images(display_url, is_primary, sort_order)")
      .eq("seller_id", profile.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("listings")
      .select("id, title, price, condition, brand, listing_images(display_url, is_primary, sort_order)")
      .eq("seller_id", profile.id)
      .eq("status", "sold")
      .order("created_at", { ascending: false })
      .limit(12),
    admin
      .from("reviews")
      .select("id, rating, comment, created_at, reviewer_id, profiles!reviewer_id(username, avatar_url)")
      .eq("reviewee_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Profile header */}
      <div className="flex items-start gap-5 mb-8">
        <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {(profile as any).avatar_url ? (
            <Image
              src={(profile as any).avatar_url}
              alt={(profile as any).username}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-olive/20">
              <span className="text-2xl font-bold text-olive">
                {(profile as any).username[0].toUpperCase()}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-2xl font-bold text-navy"
                  style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
                >
                  {(profile as any).display_name ?? `@${(profile as any).username}`}
                </h1>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                {(profile as any).is_founding_seller && (
                  <span className="rounded-full bg-olive px-2 py-0.5 text-[10px] font-semibold text-cream flex items-center gap-0.5">
                    <Star className="h-2.5 w-2.5" /> Founding Seller
                  </span>
                )}
                {(profile as any).is_ambassador && (
                  <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-semibold text-cream flex items-center gap-0.5">
                    🎖 Ambassador
                  </span>
                )}
              </div>
            </div>
            {isOwnProfile && (
              <Button size="sm" variant="outline" className="gap-1.5 flex-shrink-0" asChild>
                <Link href="/settings">
                  <Pencil className="h-3.5 w-3.5" /> Edit Profile
                </Link>
              </Button>
            )}
          </div>

          <p className="text-sm text-muted-foreground mt-1">@{(profile as any).username}</p>

          {(profile as any).bio && (
            <p className="text-sm text-navy/80 mt-2 max-w-prose">{(profile as any).bio}</p>
          )}

          <div className="flex items-center gap-5 mt-3 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4" />
              <span><strong className="text-navy">{(profile as any).total_sales}</strong> sales</span>
            </div>
            {(profile as any).average_rating && (
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
                <span>
                  <strong className="text-navy">{Number((profile as any).average_rating).toFixed(1)}</strong>
                  <span className="ml-1">({(reviews ?? []).length} reviews)</span>
                </span>
              </div>
            )}
            {(profile as any).location && (
              <span>{(profile as any).location}</span>
            )}
          </div>
        </div>
      </div>

      {/* Active listings */}
      {(listings ?? []).length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <Package className="h-4 w-4 text-olive" />
            Active Listings ({(listings ?? []).length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(listings as any[]).map((listing) => {
              const sorted = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
              const primaryImage = sorted.find((i: any) => i.is_primary)?.display_url ?? sorted[0]?.display_url ?? null;
              return (
                <ListingCard
                  key={listing.id}
                  listing={{
                    id: listing.id,
                    title: listing.title,
                    price: listing.price,
                    condition: listing.condition,
                    brand: listing.brand,
                    primary_image: primaryImage,
                    images: sorted.map((i: any) => i.display_url),
                    seller_username: (profile as any).username,
                    allows_pickup: false,
                  }}
                />
              );
            })}
          </div>
        </section>
      )}

      {/* Sold listings */}
      {(soldListings ?? []).length > 0 && (
        <section className="mb-10">
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            Sold ({(soldListings ?? []).length})
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {(soldListings as any[]).map((listing) => {
              const sorted = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
              const primaryImage = sorted.find((i: any) => i.is_primary)?.display_url ?? sorted[0]?.display_url ?? null;
              return (
                <div key={listing.id} className="rounded-xl border border-border overflow-hidden opacity-60">
                  <div className="relative aspect-square bg-muted">
                    {primaryImage ? (
                      <Image
                        src={primaryImage}
                        alt={listing.title}
                        fill
                        className="object-cover grayscale"
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-3xl opacity-20">🐴</span>
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="rotate-[-20deg] border-4 border-red-500 text-red-500 font-black text-xl px-3 py-1 rounded-sm tracking-widest uppercase opacity-90">
                        Sold
                      </span>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-medium text-navy line-clamp-1">{listing.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatAUD(listing.price)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Reviews */}
      {(reviews ?? []).length > 0 && (
        <section>
          <h2 className="font-semibold text-navy mb-4 flex items-center gap-2">
            <Star className="h-4 w-4 text-amber-400 fill-amber-400" />
            Reviews ({(reviews ?? []).length})
          </h2>
          <div className="space-y-4">
            {(reviews as any[]).map((review) => {
              const reviewer = Array.isArray(review.profiles) ? review.profiles[0] : review.profiles;
              return (
                <div key={review.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted overflow-hidden">
                        {reviewer?.avatar_url ? (
                          <Image src={reviewer.avatar_url} alt="" width={32} height={32} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-olive/10">
                            <span className="text-xs font-bold text-olive">{(reviewer?.username ?? "?")[0].toUpperCase()}</span>
                          </div>
                        )}
                      </div>
                      <Link href={`/profile/${reviewer?.username}`} className="text-sm font-medium text-navy hover:underline">
                        @{reviewer?.username ?? "user"}
                      </Link>
                    </div>
                    <div className="flex items-center gap-0.5 text-amber-400">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < review.rating ? "text-amber-400" : "text-muted-foreground/30"}>★</span>
                      ))}
                    </div>
                  </div>
                  {review.comment && (
                    <p className="text-sm text-navy/80 mt-3">{review.comment}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {(reviews ?? []).length === 0 && (listings ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">No activity yet.</p>
      )}
    </div>
  );
}
