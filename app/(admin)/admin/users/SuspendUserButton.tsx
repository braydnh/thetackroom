"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function SuspendUserButton({ userId, isSuspended: initialSuspended }: { userId: string; isSuspended: boolean }) {
  const [suspended, setSuspended] = useState(initialSuspended);
  const [loading, setLoading] = useState(false);

  async function handleToggle() {
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/suspend`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_suspended: !suspended }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed");
    } else {
      setSuspended(!suspended);
      toast.success(suspended ? "User unsuspended" : "User suspended");
    }
    setLoading(false);
  }

  return (
    <Button
      size="sm"
      variant={suspended ? "outline" : "destructive"}
      className={suspended ? "border-emerald-300 text-emerald-700 hover:bg-emerald-50" : ""}
      onClick={handleToggle}
      disabled={loading}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : suspended ? "Unsuspend" : "Suspend"}
    </Button>
  );
}
