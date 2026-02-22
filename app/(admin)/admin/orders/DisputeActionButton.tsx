"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function DisputeActionButton({ orderId, paymentIntentId }: { orderId: string; paymentIntentId: string | null }) {
  const [resolved, setResolved] = useState(false);
  const [loading, setLoading] = useState<"release" | "refund" | null>(null);

  async function handle(action: "release" | "refund") {
    setLoading(action);
    const res = await fetch(`/api/admin/orders/${orderId}/resolve-dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
    } else {
      toast.success(action === "release" ? "Payout released to seller" : "Refund issued to buyer");
      setResolved(true);
    }
    setLoading(null);
  }

  if (resolved) return <span className="text-xs text-muted-foreground">Resolved</span>;

  return (
    <div className="flex gap-1.5">
      <Button
        size="sm"
        className="bg-olive hover:bg-olive-light text-cream text-xs h-7 px-2"
        onClick={() => handle("release")}
        disabled={!!loading}
      >
        {loading === "release" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Release"}
      </Button>
      <Button
        size="sm"
        variant="destructive"
        className="text-xs h-7 px-2"
        onClick={() => handle("refund")}
        disabled={!!loading}
      >
        {loading === "refund" ? <Loader2 className="h-3 w-3 animate-spin" /> : "Refund"}
      </Button>
    </div>
  );
}
