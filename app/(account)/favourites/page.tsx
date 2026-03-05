import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { ListingCard } from "@/components/listings/ListingCard";

export default async function FavouritesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/favourites");

  const admin = createAdminClient();

  const { data: favs } = await admin
    .from("favourites")
    .select("listing_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(48);

  const listingIds = (favs ?? []).map((f: any) => f.listing_id);

  if (listingIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Favourites
        </h1>
        <div className="rounded-xl border border-border py-16 text-center">
          <Heart className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No saved items yet</p>
          <Link href="/listings" className="text-sm text-olive hover:underline mt-2 inline-block">
            Browse listings
          </Link>
        </div>
      </div>
    );
  }

  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, condition, brand, allows_pickup, primary_image_url, profiles!seller_id(username, location)")
    .in("id", listingIds)
    .in("status", ["active", "reserved"]);

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Favourites
      </h1>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {(listings as any[] ?? []).map((listing) => {
          const profile = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;
          return (
            <ListingCard
              key={listing.id}
              listing={{
                id: listing.id,
                title: listing.title,
                price: listing.price,
                condition: listing.condition,
                brand: listing.brand,
                allows_pickup: listing.allows_pickup,
                primary_image: listing.primary_image_url ?? null,
                seller_username: profile?.username ?? "seller",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
