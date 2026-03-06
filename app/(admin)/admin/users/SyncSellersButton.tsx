"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

export function SyncSellersButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ checked: number; fixed: { id: string; username: string; reason: string }[] } | null>(null);

  async function handleSync() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/stripe/sync-sellers", { method: "POST" });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" onClick={handleSync} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Sync Stripe seller status
        </Button>
        {result && (
          <p className="text-sm text-muted-foreground">
            Checked <strong>{result.checked}</strong> sellers —{" "}
            {result.fixed.length === 0 ? (
              <span className="text-emerald-600 font-medium">all good</span>
            ) : (
              <span className="text-amber-600 font-medium">{result.fixed.length} reset to buyer</span>
            )}
          </p>
        )}
      </div>

      {result && result.fixed.length > 0 && (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm space-y-1">
          {result.fixed.map((u) => (
            <div key={u.id} className="flex items-center gap-2 text-amber-800">
              <span className="font-medium">@{u.username}</span>
              <span className="text-amber-600 text-xs">
                {u.reason === "charges_disabled" && "charges disabled"}
                {u.reason === "payouts_disabled" && "payouts disabled"}
                {u.reason === "account_not_found" && "Stripe account not found"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
