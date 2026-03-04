"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function ReleasePayoutButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/release-payout`, { method: "POST" });
      let data: any = {};
      try { data = await res.json(); } catch {}
      if (!res.ok) {
        toast.error(data.error ?? `Payout failed (${res.status})`);
      } else {
        toast.success("Payout released and seller notified");
        setDone(true);
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message ?? "Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  if (done) return <span className="text-xs text-emerald-600">Paid out</span>;

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs h-7 px-2 border-amber-400 text-amber-700 hover:bg-amber-50"
      onClick={handle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Release payout"}
    </Button>
  );
}
