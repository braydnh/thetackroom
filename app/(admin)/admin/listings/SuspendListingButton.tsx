"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SuspendListingButton({ listingId, currentStatus }: { listingId: string; currentStatus: string }) {
  const [status, setStatus] = useState(currentStatus);
  const [loading, setLoading] = useState(false);

  const isSuspended = status === "suspended";
  const isDeleted = status === "deleted";

  async function updateStatus(newStatus: string) {
    setLoading(true);
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
    }
    setLoading(false);
  }

  async function handleSuspendToggle() {
    const newStatus = isSuspended ? "active" : "suspended";
    await updateStatus(newStatus);
    toast.success(isSuspended ? "Listing restored" : "Listing suspended");
  }

  async function handleDelete() {
    if (!confirm("Permanently mark this listing as deleted?")) return;
    await updateStatus("deleted");
    toast.success("Listing deleted");
  }

  if (isDeleted) return null;

  return (
    <div className="flex items-center gap-2">
      {status !== "sold" && (
        <Button
          size="sm"
          variant={isSuspended ? "outline" : "destructive"}
          className={isSuspended ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}
          onClick={handleSuspendToggle}
          disabled={loading}
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : isSuspended ? "Restore" : "Suspend"}
        </Button>
      )}
      <Button
        size="sm"
        variant="destructive"
        onClick={handleDelete}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Delete"}
      </Button>
    </div>
  );
}
