"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteSavedSearchButton({ id }: { id: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    if (!confirm("Delete this saved search?")) return;
    setLoading(true);
    await fetch(`/api/saved-searches/${id}`, { method: "DELETE" });
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
      aria-label="Delete saved search"
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
