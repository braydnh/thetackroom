import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD } from "@/lib/utils/currency";
import Link from "next/link";
import Image from "next/image";
import { SuspendListingButton } from "./SuspendListingButton";

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
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status = "active", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  const admin = createAdminClient();

  const query = admin
    .from("listings")
    .select("id, title, price, status, created_at, seller_id, listing_images(display_url, is_primary, sort_order), profiles!seller_id(username)")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status !== "all") {
    (query as any).eq("status", status);
  }

  const { data: listings } = await (query as any);

  const STATUSES = ["active", "draft", "reserved", "sold", "suspended", "deleted", "all"];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-navy" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Listings
        </h1>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/listings?status=${s}`}
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
            const images = (listing.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
            const thumb = images.find((i: any) => i.is_primary)?.display_url ?? images[0]?.display_url ?? null;
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
                    <span>{new Date(listing.created_at).toLocaleDateString("en-AU")}</span>
                  </div>
                </div>

                <SuspendListingButton listingId={listing.id} currentStatus={listing.status} />
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      <div className="flex justify-between mt-6">
        {pageNum > 1 && (
          <Link href={`/admin/listings?status=${status}&page=${pageNum - 1}`} className="text-sm text-olive hover:underline">
            ← Previous
          </Link>
        )}
        {(listings ?? []).length === pageSize && (
          <Link href={`/admin/listings?status=${status}&page=${pageNum + 1}`} className="text-sm text-olive hover:underline ml-auto">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}
