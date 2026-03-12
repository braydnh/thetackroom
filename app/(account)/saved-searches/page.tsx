import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bell, Search, Trash2 } from "lucide-react";
import { DeleteSavedSearchButton } from "./DeleteSavedSearchButton";

export default async function SavedSearchesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/saved-searches");

  const { data: searches } = await supabase
    .from("saved_searches")
    .select("id, name, query, category, subcategory, condition, min_price, max_price, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  function searchUrl(s: any): string {
    const p = new URLSearchParams();
    if (s.query) p.set("q", s.query);
    if (s.category) p.set("category", s.category);
    if (s.subcategory?.length) s.subcategory.forEach((v: string) => p.append("sub", v));
    if (s.condition?.length) s.condition.forEach((v: string) => p.append("condition", v));
    if (s.min_price) p.set("min", String(s.min_price / 100));
    if (s.max_price) p.set("max", String(s.max_price / 100));
    const qs = p.toString();
    return `/listings${qs ? `?${qs}` : ""}`;
  }

  function describeSearch(s: any): string {
    const parts: string[] = [];
    if (s.query) parts.push(`"${s.query}"`);
    if (s.category) parts.push(s.category);
    if (s.condition?.length) parts.push(s.condition.join(", "));
    if (s.min_price || s.max_price) {
      const min = s.min_price ? `$${s.min_price / 100}` : "";
      const max = s.max_price ? `$${s.max_price / 100}` : "";
      parts.push(min && max ? `${min}–${max}` : min || max);
    }
    return parts.join(" · ") || "All listings";
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="h-6 w-6 text-olive" />
        <h1
          className="text-2xl font-bold text-navy"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Saved Searches
        </h1>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Get notified when new listings match your saved searches.
      </p>

      {(searches ?? []).length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No saved searches yet</p>
          <Link href="/listings" className="text-sm text-olive hover:underline mt-2 inline-block">
            Browse listings and save a search
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {(searches as any[]).map((s) => (
            <div key={s.id} className="flex items-center gap-4 px-5 py-4 bg-white">
              <div className="flex-1 min-w-0">
                <Link href={searchUrl(s)} className="text-sm font-medium text-navy hover:underline">
                  {s.name}
                </Link>
                <p className="text-xs text-muted-foreground mt-0.5">{describeSearch(s)}</p>
              </div>
              <DeleteSavedSearchButton id={s.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
