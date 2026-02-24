"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, CheckCircle, XCircle } from "lucide-react";

export function AmbassadorActionButtons({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<"approve" | "deny" | null>(null);

  async function handleAction(action: "approve" | "deny") {
    setLoading(action);
    const res = await fetch(`/api/admin/ambassadors/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, admin_note: note }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Something went wrong.");
    } else {
      toast.success(action === "approve" ? "Ambassador approved!" : "Application denied.");
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
      <Input
        placeholder="Admin note (optional)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full sm:w-64 text-sm"
      />
      <Button
        size="sm"
        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
        onClick={() => handleAction("approve")}
        disabled={loading !== null}
      >
        {loading === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
        Approve
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="border-red-200 text-red-600 hover:bg-red-50 gap-1.5"
        onClick={() => handleAction("deny")}
        disabled={loading !== null}
      >
        {loading === "deny" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <XCircle className="h-3.5 w-3.5" />}
        Deny
      </Button>
    </div>
  );
}
