"use client";

import { Suspense } from "react";
import { ListingsSearchBar } from "@/components/listings/ListingsSearchBar";
import { useSearchParams } from "next/navigation";

function SearchForm() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") ?? "";

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <h1
        className="text-3xl font-bold text-navy mb-8 text-center"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Search
      </h1>
      <ListingsSearchBar defaultValue={q} placeholder="Search listings or sellers…" />
      <p className="mt-4 text-sm text-muted-foreground text-center">
        Search listings by keyword, or find sellers by username.
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
