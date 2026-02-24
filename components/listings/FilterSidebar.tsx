"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
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

  const updateFilter = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      params.delete("page"); // reset pagination on filter change
      router.push(`${pathname}?${params.toString()}`);
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
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    const params = new URLSearchParams();
    const q = searchParams.get("q");
    if (q) params.set("q", q);
    router.push(`${pathname}?${params.toString()}`);
  };

  const category = searchParams.get("category") ?? "";
  const subcats = searchParams.getAll("sub");
  const conditions = searchParams.getAll("condition");
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const hasFilters = category || subcats.length || conditions.length || minPrice || maxPrice;
  const subOptions = SUBCATEGORIES[category] ?? [];

  return (
    <aside className="w-full space-y-5">
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
              onChange={(e) => updateFilter("min", e.target.value || null)}
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
              onChange={(e) => updateFilter("max", e.target.value || null)}
              className="w-full rounded-md border border-input bg-white pl-5 pr-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
            />
          </div>
        </div>
      </div>
    </aside>
  );
}
