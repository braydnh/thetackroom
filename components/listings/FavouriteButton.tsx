"use client";

import { useState } from "react";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FavouriteButtonProps {
  listingId: string;
  initialFavourited: boolean;
}

export function FavouriteButton({ listingId, initialFavourited }: FavouriteButtonProps) {
  const [favourited, setFavourited] = useState(initialFavourited);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    try {
      const res = await fetch("/api/favourites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          toast.error("Please log in to save listings");
        } else {
          toast.error(data.error ?? "Something went wrong");
        }
        return;
      }
      setFavourited(data.favourited);
      toast.success(data.favourited ? "Saved to favourites" : "Removed from favourites");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      className="gap-2"
      onClick={toggle}
      disabled={loading}
    >
      <Heart
        className={cn(
          "h-4 w-4 transition-colors",
          favourited ? "fill-red-500 text-red-500" : ""
        )}
      />
      {favourited ? "Saved" : "Save"}
    </Button>
  );
}
