"use client";

import { useState } from "react";
import { Bell, BellOff, Check } from "lucide-react";

interface SaveSearchButtonProps {
  query?: string;
  category?: string;
  sub?: string | string[];
  condition?: string | string[];
  min?: string;
  max?: string;
}

export function SaveSearchButton({ query, category, sub, condition, min, max }: SaveSearchButtonProps) {
  const [state, setState] = useState<"idle" | "prompt" | "saving" | "saved">("idle");
  const [name, setName] = useState("");

  async function handleSave() {
    if (!name.trim()) return;
    setState("saving");

    const subcategory = sub ? (Array.isArray(sub) ? sub : [sub]) : [];
    const conditions = condition ? (Array.isArray(condition) ? condition : [condition]) : [];

    const res = await fetch("/api/saved-searches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        query: query || null,
        category: category || null,
        subcategory: subcategory.length ? subcategory : null,
        condition: conditions.length ? conditions : null,
        min_price: min ? Math.round(parseFloat(min) * 100) : null,
        max_price: max ? Math.round(parseFloat(max) * 100) : null,
      }),
    });

    if (res.ok) {
      setState("saved");
    } else if (res.status === 401) {
      window.location.href = "/login?next=/listings";
    } else {
      setState("idle");
    }
  }

  if (state === "saved") {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
        <Check className="h-3.5 w-3.5" /> Saved
      </span>
    );
  }

  if (state === "prompt" || state === "saving") {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          type="text"
          placeholder="Name this search…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setState("idle"); }}
          className="rounded-lg border border-border px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-olive/30 w-44"
          maxLength={60}
        />
        <button
          onClick={handleSave}
          disabled={state === "saving" || !name.trim()}
          className="rounded-lg bg-olive px-3 py-1.5 text-xs font-medium text-cream disabled:opacity-50 hover:bg-olive/90 transition-colors"
        >
          {state === "saving" ? "…" : "Save"}
        </button>
        <button onClick={() => setState("idle")} className="text-xs text-muted-foreground hover:text-navy">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setState("prompt")}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-olive transition-colors"
    >
      <Bell className="h-3.5 w-3.5" />
      Save search
    </button>
  );
}
