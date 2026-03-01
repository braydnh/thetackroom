"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Star, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FeaturedInfo = { id: string; slot: string; ends_at: string } | null;

const SLOT_LABELS: Record<string, string> = {
  homepage: "Homepage",
  search_top: "Top of Search",
};

const DURATIONS = [7, 14, 30] as const;

export function FeatureListingButton({
  listingId,
  initialFeatured,
}: {
  listingId: string;
  initialFeatured: FeaturedInfo;
}) {
  const [featured, setFeatured] = useState<FeaturedInfo>(initialFeatured);
  const [showForm, setShowForm] = useState(false);
  const [slot, setSlot] = useState<"homepage" | "search_top">("homepage");
  const [duration, setDuration] = useState<7 | 14 | 30>(7);
  const [loading, setLoading] = useState(false);

  async function handleFeature() {
    setLoading(true);
    const res = await fetch(`/api/admin/listings/${listingId}/feature`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slot, duration_days: duration }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to feature listing");
    } else {
      setFeatured(data.featured);
      setShowForm(false);
      toast.success(`Listed featured: ${SLOT_LABELS[slot]} for ${duration} days`);
    }
    setLoading(false);
  }

  async function handleRemove() {
    setLoading(true);
    const res = await fetch(`/api/admin/listings/${listingId}/feature`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to remove feature");
    } else {
      setFeatured(null);
      toast.success("Feature removed");
    }
    setLoading(false);
  }

  // Already featured — show badge + remove button
  if (featured) {
    const expiresDate = new Date(featured.ends_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium px-2 py-0.5">
          <Star className="h-2.5 w-2.5 fill-current" />
          {SLOT_LABELS[featured.slot] ?? featured.slot} · {expiresDate}
        </span>
        <button
          onClick={handleRemove}
          disabled={loading}
          className="text-muted-foreground hover:text-red-500 transition-colors"
          title="Remove feature"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
        </button>
      </div>
    );
  }

  // Not featured — show inline form or Feature button
  if (showForm) {
    return (
      <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value as "homepage" | "search_top")}
          className="rounded-md border border-border bg-white text-xs px-2 py-1 text-navy"
        >
          <option value="homepage">Homepage</option>
          <option value="search_top">Top of Search</option>
        </select>
        <select
          value={duration}
          onChange={(e) => setDuration(Number(e.target.value) as 7 | 14 | 30)}
          className="rounded-md border border-border bg-white text-xs px-2 py-1 text-navy"
        >
          {DURATIONS.map((d) => (
            <option key={d} value={d}>{d} days</option>
          ))}
        </select>
        <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-7 text-xs px-2" onClick={handleFeature} disabled={loading}>
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Confirm"}
        </Button>
        <button
          onClick={() => setShowForm(false)}
          className="text-muted-foreground hover:text-navy text-xs"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      className={cn("border-amber-300 text-amber-600 hover:bg-amber-50 flex-shrink-0")}
      onClick={() => setShowForm(true)}
    >
      <Star className="h-3 w-3 mr-1" />
      Feature
    </Button>
  );
}
