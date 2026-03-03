import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD } from "@/lib/utils/currency";
import Link from "next/link";
import { DisputeActionButton } from "./DisputeActionButton";

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
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status = "all", page = "1" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  const admin = createAdminClient();

  let query = admin
    .from("orders")
    .select("id, status, subtotal, shipping_amount, pickup_method, created_at, buyer_id, seller_id, listing_id, stripe_payment_intent_id")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status !== "all") {
    query = (query as any).eq("status", status);
  }

  const { data: orders } = await (query as any);

  const STATUSES = ["all", "disputed", "awaiting_shipment", "shipped", "dispute_window", "completed", "refunded"];

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Orders
      </h1>

      {/* Status filter */}
      <div className="flex gap-1 flex-wrap mb-6">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={`/admin/orders?status=${s}`}
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
                  <span>{new Date(order.created_at).toLocaleDateString("en-AU")}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {order.status === "disputed" && (
                  <DisputeActionButton orderId={order.id} paymentIntentId={order.stripe_payment_intent_id} />
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
          <Link href={`/admin/orders?status=${status}&page=${pageNum - 1}`} className="text-sm text-olive hover:underline">← Previous</Link>
        )}
        {(orders ?? []).length === pageSize && (
          <Link href={`/admin/orders?status=${status}&page=${pageNum + 1}`} className="text-sm text-olive hover:underline ml-auto">Next →</Link>
        )}
      </div>
    </div>
  );
}
