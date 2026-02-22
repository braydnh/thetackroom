import { ListingCard, type ListingCardData } from "./ListingCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ListingGridProps {
  listings: ListingCardData[];
  loading?: boolean;
  showFavourite?: boolean;
  favouritedIds?: Set<string>;
  onFavouriteToggle?: (id: string) => void;
  emptyMessage?: string;
}

export function ListingGrid({
  listings,
  loading = false,
  showFavourite,
  favouritedIds,
  onFavouriteToggle,
  emptyMessage = "No listings found.",
}: ListingGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex flex-col rounded-xl overflow-hidden border border-border bg-white">
            <Skeleton className="aspect-square w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-4 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (listings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <span className="text-5xl mb-4">🐴</span>
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          showFavourite={showFavourite}
          isFavourited={favouritedIds?.has(listing.id)}
          onFavouriteToggle={onFavouriteToggle}
        />
      ))}
    </div>
  );
}
