"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function SearchForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    router.push(trimmed ? `/listings?q=${encodeURIComponent(trimmed)}` : "/listings");
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1
        className="text-3xl font-bold text-navy mb-8 text-center"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Search listings
      </h1>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          autoFocus
          placeholder="e.g. dressage saddle, Horseware rug, size 16..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 h-12 text-base"
        />
        <Button type="submit" className="h-12 px-6 bg-olive hover:bg-olive-light text-cream gap-2">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </form>
      <p className="mt-4 text-sm text-muted-foreground text-center">
        Search across all equestrian gear — saddles, rugs, bridles, clothing and more.
      </p>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchForm />
    </Suspense>
  );
}
