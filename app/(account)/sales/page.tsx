import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { formatAUD } from "@/lib/utils/currency";
import { ShoppingBag, ChevronRight } from "lucide-react";

const STATUS_LABEL: Record<string, string> = {
  pending_payment:   "Pending payment",
  payment_captured:  "Paid",
  awaiting_shipment: "Awaiting shipment",
  shipped:           "Shipped",
  delivered:         "Delivered",
  dispute_window:    "In dispute window",
  completed:         "Completed",
  disputed:          "Disputed",
  refunded:          "Refunded",
  cancelled:         "Cancelled",
};

const STATUS_COLOR: Record<string, string> = {
  pending_payment:   "bg-muted text-muted-foreground",
  payment_captured:  "bg-amber-100 text-amber-700",
  awaiting_shipment: "bg-amber-100 text-amber-700",
  shipped:           "bg-sky-100 text-sky-700",
  delivered:         "bg-emerald-100 text-emerald-700",
  dispute_window:    "bg-emerald-100 text-emerald-700",
  completed:         "bg-emerald-100 text-emerald-700",
  disputed:          "bg-red-100 text-red-700",
  refunded:          "bg-muted text-muted-foreground",
  cancelled:         "bg-muted text-muted-foreground",
};

export default async function SalesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/sales");

  const admin = createAdminClient();

  // Sales only (user is seller)
  const { data: orders } = await admin
    .from("orders")
    .select("id, status, subtotal, shipping_amount, pickup_method, created_at, listing_id, buyer_id, seller_id")
    .eq("seller_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const listingIds = [...new Set((orders ?? []).map((o: any) => o.listing_id))];
  const { data: listings } = listingIds.length > 0
    ? await admin
        .from("listings")
        .select("id, title, listing_images(display_url, is_primary, sort_order)")
        .in("id", listingIds)
    : { data: [] };

  const listingMap = new Map<string, any>();
  (listings ?? []).forEach((l: any) => listingMap.set(l.id, l));

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <div className="flex items-center gap-4 mb-6">
        <h1
          className="text-2xl font-bold text-navy"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          My Sales
        </h1>
        <Link
          href="/orders"
          className="ml-auto text-sm text-olive hover:underline"
        >
          ← My Orders
        </Link>
      </div>

      {(orders ?? []).length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center">
          <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No sales yet</p>
          <Link href="/selling/listings/new" className="text-sm text-olive hover:underline mt-2 inline-block">
            List an item
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
          {(orders as any[]).map((order) => {
            const listing = listingMap.get(order.listing_id);
            const images = (listing?.listing_images ?? []) as { display_url: string; is_primary: boolean; sort_order: number }[];
            const thumb =
              images.find((i: any) => i.is_primary)?.display_url ??
              images.sort((a: any, b: any) => a.sort_order - b.sort_order)[0]?.display_url ??
              null;

            const total = order.subtotal + order.shipping_amount;
            const statusLabel = STATUS_LABEL[order.status] ?? order.status;
            const statusColor = STATUS_COLOR[order.status] ?? "bg-muted text-muted-foreground";

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-stone-50 transition-colors"
              >
                <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {thumb ? (
                    <Image src={thumb} alt="" width={56} height={56} className="object-cover h-full w-full" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center">
                      <span className="text-xl opacity-20">🐴</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-navy truncate max-w-[200px] sm:max-w-xs">
                      {listing?.title ?? "Listing"}
                    </p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColor}`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span>{formatAUD(total)}</span>
                    <span>{order.pickup_method === "local_pickup" ? "Local pickup" : "Shipping"}</span>
                    <span>{new Date(order.created_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}</span>
                  </div>
                </div>

                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
