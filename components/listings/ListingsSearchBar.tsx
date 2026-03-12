"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function ListingsSearchBar({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(defaultValue ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) {
      params.set("q", value.trim());
    } else {
      params.delete("q");
    }
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  function clear() {
    setValue("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    params.delete("page");
    router.push(`/listings?${params.toString()}`);
  }

  return (
    <form onSubmit={submit} className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search listings…"
        className="w-full rounded-full border border-border bg-white pl-10 pr-10 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive transition-colors"
      />
      {value && (
        <button
          type="button"
          onClick={clear}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </form>
  );
}
