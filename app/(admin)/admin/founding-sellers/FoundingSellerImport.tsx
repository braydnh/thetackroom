"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";

export function FoundingSellerImport() {
  const [emails, setEmails] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImport() {
    const list = emails.split(/[\n,]+/).map((e) => e.trim().toLowerCase()).filter(Boolean);
    if (list.length === 0) return;
    setLoading(true);
    const res = await fetch("/api/admin/founding-sellers/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails: list }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Import failed");
    } else {
      toast.success(`Imported ${data.imported} emails (${data.skipped} already existed)`);
      setEmails("");
    }
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5 space-y-3">
      <p className="text-sm font-semibold text-navy">Import emails</p>
      <p className="text-xs text-muted-foreground">Paste email addresses, one per line or comma-separated.</p>
      <Textarea
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder="founder@example.com&#10;rider@example.com"
        rows={6}
        className="font-mono text-xs resize-none"
      />
      <Button
        onClick={handleImport}
        className="bg-olive hover:bg-olive-light text-cream gap-2"
        disabled={loading || !emails.trim()}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        Import
      </Button>
    </div>
  );
}
