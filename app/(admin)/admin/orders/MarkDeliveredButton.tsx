"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function MarkDeliveredButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();

  async function handle() {
    setLoading(true);
    const res = await fetch(`/api/admin/orders/${orderId}/mark-delivered`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
    } else {
      toast.success("Moved to dispute window");
      setDone(true);
      router.refresh();
    }
    setLoading(false);
  }

  if (done) return <span className="text-xs text-emerald-600">Done</span>;

  return (
    <Button
      size="sm"
      variant="outline"
      className="text-xs h-7 px-2"
      onClick={handle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "Delivered"}
    </Button>
  );
}
