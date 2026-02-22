"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface ConfigEditorProps {
  configKey: string;
  currentValue: string;
  label: string;
  description: string;
  suffix?: string;
}

export function ConfigEditor({ configKey, currentValue, label, description, suffix }: ConfigEditorProps) {
  const [value, setValue] = useState(currentValue);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    if (!value.trim()) return;
    setSaving(true);
    const res = await fetch("/api/admin/config", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: configKey, value: value.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to save");
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      <div className="mb-3">
        <p className="font-semibold text-navy text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            type="number"
            value={value}
            onChange={(e) => { setValue(e.target.value); setSaved(false); }}
            step="0.1"
            min="0"
            className="pr-10"
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {suffix}
            </span>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || value === currentValue}
          size="sm"
          className="bg-olive hover:bg-olive-light text-cream w-20"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : saved ? (
            <><Check className="h-3.5 w-3.5" /> Saved</>
          ) : (
            "Save"
          )}
        </Button>
      </div>
    </div>
  );
}
