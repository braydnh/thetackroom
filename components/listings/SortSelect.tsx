"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";

export function SortSelect({ current }: { current?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const params = new URLSearchParams(searchParams.toString());
    if (e.target.value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", e.target.value);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  };

  return (
    <select
      value={current ?? "newest"}
      onChange={handleChange}
      className="rounded-md border border-input bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
    >
      <option value="newest">Newest first</option>
      <option value="price_asc">Price: Low to High</option>
      <option value="price_desc">Price: High to Low</option>
    </select>
  );
}
