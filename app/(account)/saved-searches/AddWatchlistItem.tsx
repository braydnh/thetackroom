"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function AddWatchlistItem() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [existingMatch, setExistingMatch] = useState<{ count: number; url: string } | null>(null);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSaving(true);
    setError("");
    setExistingMatch(null);

    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: value.trim(), query: value.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      setValue("");
      router.refresh();
      if (data.existingCount > 0) {
        setExistingMatch({ count: data.existingCount, url: data.searchUrl });
      }
    } else if (res.status === 401) {
      window.location.href = "/login?next=/saved-searches";
    } else {
      const data = await res.json();
      setError(data.error ?? "Something went wrong.");
    }
    setSaving(false);
  }

  return (
    <div className="mb-6">
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => { setValue(e.target.value); setExistingMatch(null); }}
          placeholder='e.g. "Flex-On stirrups" or "size 57 Kep helmet"'
          maxLength={80}
          className="flex-1 rounded-lg border border-border px-3 py-2.5 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/30 focus:border-olive"
        />
        <button
          type="submit"
          disabled={saving || !value.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-olive px-4 py-2.5 text-sm font-medium text-cream hover:bg-olive/90 disabled:opacity-50 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          {saving ? "Adding…" : "Add"}
        </button>
      </form>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      {existingMatch && (
        <div className="mt-2 rounded-lg border border-olive/30 bg-olive/5 px-3 py-2 text-sm text-navy flex items-center justify-between gap-3">
          <span>
            <strong>{existingMatch.count}</strong> existing {existingMatch.count === 1 ? "listing matches" : "listings match"} this — you&apos;ll be notified about new ones.
          </span>
          <Link href={existingMatch.url} className="text-olive font-medium hover:underline whitespace-nowrap text-xs">
            View now →
          </Link>
        </div>
      )}
    </div>
  );
}
