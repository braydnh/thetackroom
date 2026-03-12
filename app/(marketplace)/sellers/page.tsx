import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { Search, Star } from "lucide-react";

export default async function SellersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q = "", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 24;
  const offset = (pageNum - 1) * pageSize;

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("username, display_name, avatar_url, bio, location, is_founding_seller, is_ambassador, total_sales, average_rating", { count: "exact" })
    .eq("is_suspended", false)
    .order("total_sales", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q.trim()) {
    query = (query as any).or(`username.ilike.%${q.trim()}%,display_name.ilike.%${q.trim()}%`);
  }

  const { data: sellers, count } = await (query as any);

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  function pageUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/sellers${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Find Sellers
      </h1>

      {/* Search */}
      <form method="GET" action="/sellers" className="mb-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            type="search"
            placeholder="Search by username or name…"
            className="w-full rounded-full border border-border bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
            autoComplete="off"
          />
        </div>
      </form>

      {(sellers ?? []).length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">
          {q ? `No sellers found for "${q}"` : "No sellers yet"}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(sellers as any[]).map((seller) => (
              <Link
                key={seller.username}
                href={`/profile/${seller.username}`}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-white p-4 hover:shadow-md transition-shadow text-center"
              >
                {seller.avatar_url ? (
                  <Image
                    src={seller.avatar_url}
                    alt={seller.display_name ?? seller.username}
                    width={64}
                    height={64}
                    className="rounded-full object-cover h-16 w-16"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-olive/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-olive">
                      {(seller.display_name ?? seller.username)?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-navy truncate max-w-[120px]">
                    {seller.display_name ?? seller.username}
                  </p>
                  <p className="text-xs text-muted-foreground">@{seller.username}</p>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap justify-center">
                  {seller.is_founding_seller && (
                    <span className="text-[10px] text-olive font-medium">★ Founding</span>
                  )}
                  {seller.is_ambassador && (
                    <span className="text-[10px] text-navy font-medium">🎖 Ambassador</span>
                  )}
                </div>

                {seller.total_sales > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {seller.total_sales} sale{seller.total_sales !== 1 ? "s" : ""}
                    {seller.average_rating ? ` · ${seller.average_rating.toFixed(1)} ★` : ""}
                  </p>
                )}
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10 flex-wrap">
              {pageNum > 1 && (
                <Link href={pageUrl(pageNum - 1)} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-olive hover:text-cream hover:border-olive transition-colors">←</Link>
              )}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Link
                  key={p}
                  href={pageUrl(p)}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors ${
                    p === pageNum ? "bg-olive text-cream border-olive" : "border-border text-navy hover:bg-olive hover:text-cream hover:border-olive"
                  }`}
                >
                  {p}
                </Link>
              ))}
              {pageNum < totalPages && (
                <Link href={pageUrl(pageNum + 1)} className="rounded-full border border-border px-4 py-2 text-sm font-medium text-navy hover:bg-olive hover:text-cream hover:border-olive transition-colors">→</Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
