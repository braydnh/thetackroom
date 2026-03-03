import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD } from "@/lib/utils/currency";
import { Package, Users, ShoppingCart, Banknote, TrendingUp, AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function AdminOverviewPage() {
  const admin = createAdminClient();

  const [
    { count: totalListings },
    { count: activeListings },
    { count: totalOrders },
    { count: completedOrders },
    { count: totalUsers },
    { data: recentOrders },
    { data: disputedOrders },
    { data: configRows },
  ] = await Promise.all([
    admin.from("listings").select("*", { count: "exact", head: true }),
    admin.from("listings").select("*", { count: "exact", head: true }).eq("status", "active"),
    admin.from("orders").select("*", { count: "exact", head: true }),
    admin.from("orders").select("*", { count: "exact", head: true }).eq("status", "completed"),
    admin.from("profiles").select("*", { count: "exact", head: true }),
    admin.from("orders").select("id, status, subtotal, shipping_amount, created_at, listing_id").order("created_at", { ascending: false }).limit(5),
    admin.from("orders").select("id, status, created_at").eq("status", "disputed").limit(10),
    admin.from("platform_config").select("key, value"),
  ]);

  const commissionPct = (configRows ?? []).find((r: any) => r.key === "commission_pct")?.value ?? "5.0";

  const stats = [
    { label: "Total listings", value: totalListings ?? 0, sub: `${activeListings ?? 0} active`, icon: Package, color: "text-olive" },
    { label: "Total orders", value: totalOrders ?? 0, sub: `${completedOrders ?? 0} completed`, icon: ShoppingCart, color: "text-sky-600" },
    { label: "Total users", value: totalUsers ?? 0, sub: "registered accounts", icon: Users, color: "text-violet-600" },
    { label: "Commission rate", value: `${commissionPct}%`, sub: "of item price", icon: Banknote, color: "text-amber-600" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Admin Overview
      </h1>

      {/* Dispute alert */}
      {(disputedOrders ?? []).length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-red-900">
              {(disputedOrders ?? []).length} disputed order{(disputedOrders ?? []).length !== 1 ? "s" : ""} need attention
            </p>
            <p className="text-sm text-red-700 mt-0.5">Review and resolve disputes to release payouts or issue refunds.</p>
          </div>
          <Link href="/admin/orders?status=disputed" className="text-sm font-medium text-red-700 hover:underline flex-shrink-0">
            View →
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-white p-4">
            <s.icon className={`h-4 w-4 mb-2 ${s.color}`} />
            <p className="text-xl font-bold text-navy">{s.value}</p>
            <p className="text-xs font-medium text-muted-foreground mt-0.5">{s.label}</p>
            <p className="text-[10px] text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { href: "/admin/listings", label: "Moderate listings" },
          { href: "/admin/orders", label: "View all orders" },
          { href: "/admin/users", label: "Manage users" },
          { href: "/admin/config", label: "Platform config" },
        ].map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className="rounded-xl border border-border bg-white p-3 text-center text-sm font-medium text-olive hover:border-olive hover:bg-olive/5 transition-colors"
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Recent orders */}
      {(recentOrders ?? []).length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-white">
            <h2 className="font-semibold text-navy flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-olive" /> Recent Orders
            </h2>
          </div>
          <div className="divide-y divide-border">
            {(recentOrders as any[]).map((order) => (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3 bg-white hover:bg-stone-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-mono text-navy">{order.id.slice(0, 8)}…</p>
                  <p className="text-xs text-muted-foreground capitalize">{order.status.replace(/_/g, " ")}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-navy">{formatAUD(order.subtotal + order.shipping_amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString("en-AU")}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
