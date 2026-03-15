"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function NewRequestForm() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (title.trim().length < 5) {
      toast.error("Title must be at least 5 characters");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/feature-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    });
    if (res.ok) {
      toast.success("Request submitted!");
      setTitle("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      toast.error(data.error ?? "Failed to submit");
    }
    setLoading(false);
  }

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="bg-olive hover:bg-olive-light text-cream gap-1.5"
        size="sm"
      >
        <Plus className="h-4 w-4" /> Request a feature
      </Button>
    );
  }

  return (
    <div className="rounded-xl border border-olive/30 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-navy">New feature request</h2>
        <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-navy">
          <X className="h-4 w-4" />
        </button>
      </div>
      <form onSubmit={submit} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="fr-title">Title <span className="text-red-500">*</span></Label>
          <Input
            id="fr-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Add bulk listing management"
            maxLength={120}
            required
          />
          <p className="text-[10px] text-muted-foreground">{title.length}/120</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="fr-desc">Description <span className="text-muted-foreground text-xs">(optional)</span></Label>
          <Textarea
            id="fr-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the feature and why it would be useful…"
            rows={3}
            maxLength={1000}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button type="submit" size="sm" className="bg-olive hover:bg-olive-light text-cream" disabled={loading}>
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}
