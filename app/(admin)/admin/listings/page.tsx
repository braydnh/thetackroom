import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD } from "@/lib/utils/currency";
import Link from "next/link";
import Image from "next/image";
import { SuspendListingButton } from "./SuspendListingButton";
import { FeatureListingButton } from "./FeatureListingButton";

const STATUS_COLOR: Record<string, string> = {
  active:    "bg-emerald-100 text-emerald-700",
  draft:     "bg-muted text-muted-foreground",
  reserved:  "bg-amber-100 text-amber-700",
  sold:      "bg-sky-100 text-sky-700",
  suspended: "bg-red-100 text-red-700",
  deleted:   "bg-muted text-muted-foreground",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const { status = "active", page = "1", q = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  const admin = createAdminClient();

  let query = admin
    .from("listings")
    .select("id, title, price, status, created_at, seller_id, primary_image_url, profiles!seller_id(username)")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status !== "all") {
    query = (query as any).eq("status", status);
  }

  if (q.trim()) {
    query = (query as any).ilike("title", `%${q.trim()}%`);
  }

  const { data: listings } = await (query as any);

  // Fetch active featured status for this page of listings
  const listingIds: string[] = (listings ?? []).map((l: any) => l.id);
  const { data: featuredRows } = listingIds.length
    ? await admin
        .from("featured_listings")
        .select("id, listing_id, slot, ends_at")
        .in("listing_id", listingIds)
        .gt("ends_at", new Date().toISOString())
    : { data: [] };

  const featuredMap = Object.fromEntries(
    (featuredRows ?? []).map((f: any) => [f.listing_id, f])
  );

  const STATUSES = ["active", "draft", "reserved", "sold", "suspended", "deleted", "all"];

  function tabUrl(s: string) {
    const p = new URLSearchParams({ status: s });
    if (q) p.set("q", q);
    return `/admin/listings?${p}`;
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams({ status, page: String(p) });
    if (q) params.set("q", q);
    return `/admin/listings?${params}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Listings
        </h1>
      </div>

      {/* Search */}
      <form method="GET" action="/admin/listings" className="mb-4">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Search by title or seller username…"
          className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
          autoComplete="off"
        />
      </form>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={tabUrl(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              status === s ? "bg-olive text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {s.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {(listings ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No listings found</div>
        ) : (
          (listings as any[]).map((listing) => {
            const thumb = listing.primary_image_url ?? null;
            const seller = Array.isArray(listing.profiles) ? listing.profiles[0] : listing.profiles;

            return (
              <div key={listing.id} className="flex items-center gap-4 px-5 py-4 bg-white">
                <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {thumb ? (
                    <Image src={thumb} alt="" width={48} height={48} className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-lg opacity-20">🐴</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/listings/${listing.id}`} target="_blank" className="text-sm font-medium text-navy hover:underline truncate max-w-xs">
                      {listing.title}
                    </Link>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[listing.status] ?? "bg-muted"}`}>
                      {listing.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                    <span>{formatAUD(listing.price)}</span>
                    <span>@{seller?.username ?? "—"}</span>
                    <span>{new Date(listing.created_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}</span>
                  </div>
                </div>

                <FeatureListingButton listingId={listing.id} initialFeatured={featuredMap[listing.id] ?? null} />
                <SuspendListingButton listingId={listing.id} currentStatus={listing.status} />
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-6">
        {pageNum > 1 && (
          <Link href={pageUrl(pageNum - 1)} className="text-sm text-olive hover:underline">← Previous</Link>
        )}
        {(listings ?? []).length === pageSize && (
          <Link href={pageUrl(pageNum + 1)} className="text-sm text-olive hover:underline ml-auto">Next →</Link>
        )}
      </div>
    </div>
  );
}
