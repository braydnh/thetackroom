"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback, useTransition, useState, useEffect, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

const CONDITIONS = [
  { value: "new_with_tags", label: "New with tags" },
  { value: "like_new", label: "Like new" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" },
  { value: "worn", label: "Well loved" },
];

const SUBCATEGORIES: Record<string, { value: string; label: string }[]> = {
  horse: [
    { value: "saddles", label: "Saddles" },
    { value: "girths", label: "Girths" },
    { value: "bridles", label: "Bridles & Accessories" },
    { value: "boots-bandages", label: "Boots & Bandages" },
    { value: "rugs", label: "Rugs" },
    { value: "lunging-training", label: "Lunging & Training" },
  ],
  rider: [
    { value: "clothing", label: "Clothing" },
    { value: "footwear", label: "Footwear" },
    { value: "helmets-safety", label: "Helmets & Safety" },
  ],
};

export function FilterSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const category = searchParams.get("category") ?? "";
  const subcats = searchParams.getAll("sub");
  const conditions = searchParams.getAll("condition");
  const hasFilters = category || subcats.length || conditions.length || searchParams.get("min") || searchParams.get("max");
  const subOptions = SUBCATEGORIES[category] ?? [];

  // Debounced price inputs — local state syncs to URL after 600ms of inactivity
  const [minPrice, setMinPrice] = useState(searchParams.get("min") ?? "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max") ?? "");
  const priceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local price state in sync if URL changes externally (e.g. clear all)
  useEffect(() => {
    setMinPrice(searchParams.get("min") ?? "");
    setMaxPrice(searchParams.get("max") ?? "");
  }, [searchParams]);

  const commitPrice = useCallback(
    (min: string, max: string) => {
      if (priceTimer.current) clearTimeout(priceTimer.current);
      priceTimer.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (min) params.set("min", min); else params.delete("min");
        if (max) params.set("max", max); else params.delete("max");
        params.delete("page");
        startTransition(() => router.push(`${pathname}?${params.toString()}`));
      }, 600);
    },
    [router, pathname, searchParams]
  );

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const toggleArrayFilter = useCallback(
    (key: string, value: string) => {
      const current = searchParams.getAll(key);
      const params = new URLSearchParams(searchParams.toString());
      params.delete(key);
      if (current.includes(value)) {
        current.filter((v) => v !== value).forEach((v) => params.append(key, v));
      } else {
        [...current, value].forEach((v) => params.append(key, v));
      }
      params.delete("page");
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <aside className={`w-full space-y-5 transition-opacity ${isPending ? "opacity-60" : "opacity-100"}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-sm text-navy">Filters</h2>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-muted-foreground" onClick={clearAll}>
            <X className="h-3 w-3" /> Clear all
          </Button>
        )}
      </div>

      <Separator />

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Category</Label>
        <div className="flex flex-col gap-1">
          {[
            { value: "", label: "All" },
            { value: "horse", label: "For the Horse" },
            { value: "rider", label: "For the Rider" },
            { value: "sale", label: "Sale & Deals" },
          ].map((c) => (
            <button
              key={c.value}
              onClick={() => updateFilter("category", c.value || null)}
              className={`text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                category === c.value
                  ? "bg-olive text-cream font-medium"
                  : "text-navy hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subcategories */}
      {subOptions.length > 0 && (
        <>
          <Separator />
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Type</Label>
            <div className="flex flex-col gap-1">
              {subOptions.map((s) => (
                <button
                  key={s.value}
                  onClick={() => toggleArrayFilter("sub", s.value)}
                  className={`text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                    subcats.includes(s.value)
                      ? "bg-olive/10 text-olive font-medium"
                      : "text-navy hover:bg-muted"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <Separator />

      {/* Condition */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Condition</Label>
        <div className="flex flex-col gap-1">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              onClick={() => toggleArrayFilter("condition", c.value)}
              className={`text-left px-2 py-1.5 rounded-md text-sm transition-colors ${
                conditions.includes(c.value)
                  ? "bg-olive/10 text-olive font-medium"
                  : "text-navy hover:bg-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Price range */}
      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Price (AUD)</Label>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              placeholder="Min"
              value={minPrice}
              min={0}
              onChange={(e) => {
                setMinPrice(e.target.value);
                commitPrice(e.target.value, maxPrice);
              }}
              className="w-full rounded-md border border-input bg-white pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
            />
          </div>
          <span className="text-muted-foreground text-xs">–</span>
          <div className="relative flex-1">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
            <input
              type="number"
              placeholder="Max"
              value={maxPrice}
              min={0}
              onChange={(e) => {
                setMaxPrice(e.target.value);
                commitPrice(minPrice, e.target.value);
              }}
              className="w-full rounded-md border border-input bg-white pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
