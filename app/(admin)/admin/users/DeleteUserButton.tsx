"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export function DeleteUserButton({ userId, username }: { userId: string; username: string }) {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function handleDelete() {
    if (!confirm(`Permanently delete @${username}? This cannot be undone.`)) return;
    setLoading(true);
    const res = await fetch(`/api/admin/users/${userId}/delete`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to delete user");
    } else {
      setDeleted(true);
      toast.success(`@${username} deleted`);
    }
    setLoading(false);
  }

  if (deleted) return null;

  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-red-500 hover:text-red-700 hover:bg-red-50 px-2"
      onClick={handleDelete}
      disabled={loading}
      title="Delete user"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </Button>
  );
}
