"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Plus, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Props {
  initialCoupons: Coupon[];
}

const EMPTY_FORM = { code: "", discount_type: "percentage" as const, discount_value: "", max_uses: "", expires_at: "" };

export function CouponManager({ initialCoupons }: Props) {
  const router = useRouter();
  const [coupons, setCoupons] = useState(initialCoupons);
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const setField = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to create coupon");
    } else {
      setCoupons((prev) => [data, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
      toast.success(`Coupon ${data.code} created`);
    }
  }

  async function toggleActive(coupon: Coupon) {
    setLoadingId(coupon.id);
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !coupon.is_active }),
    });
    const data = await res.json();
    setLoadingId(null);
    if (!res.ok) {
      toast.error(data.error ?? "Failed to update");
    } else {
      setCoupons((prev) => prev.map((c) => c.id === coupon.id ? data : c));
    }
  }

  async function handleDelete(coupon: Coupon) {
    if (!confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) return;
    setLoadingId(coupon.id);
    const res = await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
    setLoadingId(null);
    if (!res.ok) {
      toast.error("Failed to delete coupon");
    } else {
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      toast.success(`Coupon deleted`);
    }
  }

  function formatDiscount(c: Coupon) {
    return c.discount_type === "percentage"
      ? `${c.discount_value}% off`
      : `$${c.discount_value.toFixed(2)} off`;
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      <div className="flex justify-end">
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-olive hover:bg-olive-light text-cream gap-2"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Cancel" : "New coupon"}
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <form onSubmit={handleCreate} className="rounded-xl border border-border bg-white p-5 space-y-4">
          <p className="font-semibold text-navy text-sm">New Coupon</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy">Code *</label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setField("code", e.target.value.toUpperCase())}
                placeholder="e.g. GIVEAWAY2024"
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40 uppercase"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy">Discount type *</label>
              <select
                value={form.discount_type}
                onChange={(e) => setField("discount_type", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed amount ($)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy">
                {form.discount_type === "percentage" ? "Percentage off (0–100) *" : "Dollar amount off *"}
              </label>
              <input
                type="number"
                value={form.discount_value}
                onChange={(e) => setField("discount_value", e.target.value)}
                placeholder={form.discount_type === "percentage" ? "100" : "50.00"}
                min="0.01"
                max={form.discount_type === "percentage" ? "100" : undefined}
                step={form.discount_type === "percentage" ? "1" : "0.01"}
                required
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-navy">Max uses (leave blank = unlimited)</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={(e) => setField("max_uses", e.target.value)}
                placeholder="1"
                min="1"
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs font-medium text-navy">Expiry date (leave blank = never expires)</label>
              <input
                type="datetime-local"
                value={form.expires_at}
                onChange={(e) => setField("expires_at", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={creating}
              className="bg-olive hover:bg-olive-light text-cream"
              size="sm"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create coupon"}
            </Button>
          </div>
        </form>
      )}

      {/* Coupons table */}
      {coupons.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted-foreground text-sm">
          No coupons yet. Create one above.
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-navy">Code</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Discount</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Uses</th>
                <th className="text-left px-4 py-3 font-medium text-navy hidden sm:table-cell">Expires</th>
                <th className="text-left px-4 py-3 font-medium text-navy">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border bg-white">
              {coupons.map((c) => (
                <tr key={c.id} className={cn(!c.is_active && "opacity-50")}>
                  <td className="px-4 py-3 font-mono font-semibold text-navy">{c.code}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDiscount(c)}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {c.uses_count}{c.max_uses !== null ? ` / ${c.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString("en-AU", { timeZone: "Australia/Sydney" }) : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      c.is_active ? "bg-emerald-100 text-emerald-700" : "bg-muted text-muted-foreground"
                    )}>
                      {c.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => toggleActive(c)}
                        disabled={loadingId === c.id}
                        title={c.is_active ? "Deactivate" : "Activate"}
                        className="text-muted-foreground hover:text-navy transition-colors"
                      >
                        {loadingId === c.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : c.is_active ? (
                          <ToggleRight className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        disabled={loadingId === c.id}
                        title="Delete"
                        className="text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
