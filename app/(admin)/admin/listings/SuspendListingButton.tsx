"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SuspendListingButton({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const isSuspended = status === "suspended";

  async function handleToggle() {
    setLoading(true);
    const newStatus = isSuspended ? "active" : "suspended";
    const res = await fetch(`/api/admin/listings/${listingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to update listing");
    } else {
      setStatus(newStatus);
      toast.success(isSuspended ? "Listing restored" : "Listing suspended");
    }
    setLoading(false);
  }

  if (status === "deleted" || status === "sold") return null;

  return (
    <Button
      size="sm"
      variant={isSuspended ? "outline" : "destructive"}
      className={isSuspended ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSuspended ? "Restore" : "Suspend"}
    </Button>
  );
}
