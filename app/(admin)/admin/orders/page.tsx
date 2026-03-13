import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD } from "@/lib/utils/currency";
import Link from "next/link";
import { DisputeActionButton } from "./DisputeActionButton";
import { SyncPaymentButton } from "./SyncPaymentButton";
import { ReleasePayoutButton } from "./ReleasePayoutButton";
import { MarkDeliveredButton } from "./MarkDeliveredButton";

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

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const { status = "all", page = "1", q = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, status, subtotal, shipping_amount, pickup_method, created_at, buyer_id, seller_id, listing_id, stripe_payment_intent_id, stripe_transfer_id, tracking_number")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status !== "all") {
    query = (query as any).eq("status", status);
  }

  if (q.trim()) {
    const trimmed = q.trim();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
    if (isUuid) {
      query = (query as any).eq("id", trimmed);
    } else {
      query = (query as any).ilike("tracking_number", `%${trimmed}%`);
    }
  }

  const { data: orders } = await (query as any);

  const STATUSES = ["all", "pending_payment", "disputed", "awaiting_shipment", "shipped", "dispute_window", "completed", "refunded"];

  function tabUrl(s: string) {
    const p = new URLSearchParams({ status: s });
    if (q) p.set("q", q);
    return `/admin/orders?${p}`;
  }

  function pageUrl(p: number) {
    const params = new URLSearchParams({ status, page: String(p) });
    if (q) params.set("q", q);
    return `/admin/orders?${params}`;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Orders
      </h1>

      {/* Search */}
      <form method="GET" action="/admin/orders" className="mb-4">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          type="search"
          placeholder="Search by tracking number or full order ID…"
          className="w-full max-w-sm rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
          autoComplete="off"
        />
      </form>

      {/* Status filter */}
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
        {(orders ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No orders found</div>
        ) : (
          (orders as any[]).map((order) => (
            <div key={order.id} className="flex items-center gap-4 px-5 py-4 bg-white">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-mono text-navy">{order.id.slice(0, 8)}…</span>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[order.status] ?? "bg-muted"}`}>
                    {order.status.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs text-muted-foreground capitalize">{order.pickup_method === "local_pickup" ? "Pickup" : "Shipping"}</span>
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{formatAUD(order.subtotal + order.shipping_amount)}</span>
                  <span>{new Date(order.created_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" })}</span>
                  {order.tracking_number && (
                    <span className="font-mono">{order.tracking_number}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {order.status === "pending_payment" && order.stripe_payment_intent_id && (
                  <SyncPaymentButton orderId={order.id} />
                )}
                {order.status === "shipped" && (
                  <MarkDeliveredButton orderId={order.id} />
                )}
                {order.status === "disputed" && (
                  <DisputeActionButton orderId={order.id} paymentIntentId={order.stripe_payment_intent_id} />
                )}
                {order.status === "completed" && !order.stripe_transfer_id && (
                  <ReleasePayoutButton orderId={order.id} />
                )}
                <Link
                  href={`/orders/${order.id}`}
                  target="_blank"
                  className="text-xs text-olive hover:underline"
                >
                  View →
                </Link>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between mt-6">
        {pageNum > 1 && (
          <Link href={pageUrl(pageNum - 1)} className="text-sm text-olive hover:underline">← Previous</Link>
        )}
        {(orders ?? []).length === pageSize && (
          <Link href={pageUrl(pageNum + 1)} className="text-sm text-olive hover:underline ml-auto">Next →</Link>
        )}
      </div>
    </div>
  );
}
