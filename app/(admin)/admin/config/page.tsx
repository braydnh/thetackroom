import { createAdminClient } from "@/lib/supabase/admin";
import { ConfigEditor } from "./ConfigEditor";

const CONFIG_DESCRIPTIONS: Record<string, { label: string; desc: string; suffix?: string }> = {
  commission_pct:           { label: "Standard commission rate", desc: "Percentage of item price taken as platform fee for regular sellers. Applied to all new orders.", suffix: "%" },
  ambassador_commission_pct: { label: "Ambassador commission rate", desc: "Commission rate for approved ambassadors. Set lower than standard to reward ambassadors.", suffix: "%" },
  admin_commission_pct:     { label: "Admin commission rate", desc: "Commission rate for admin-role sellers. Set to 0 for zero-fee admin sales.", suffix: "%" },
  dispute_window_hours:     { label: "Dispute window", desc: "Hours after delivery confirmation before payout is auto-released to seller.", suffix: "hrs" },
  tracking_deadline_days:   { label: "Tracking deadline", desc: "Days after payment before buyer can request refund if no tracking submitted.", suffix: "days" },
};

export default async function AdminConfigPage() {
  const admin = createAdminClient();
  const { data: rows } = await admin.from("platform_config").select("key, value");

  const config: Record<string, string> = {};
  (rows ?? []).forEach((r: any) => { config[r.key] = r.value; });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-2"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Platform Config
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Changes take effect immediately for all new orders. Existing orders retain the values locked at purchase.
      </p>

      <div className="space-y-4">
        {Object.entries(CONFIG_DESCRIPTIONS).map(([key, meta]) => (
          <ConfigEditor
            key={key}
            configKey={key}
            currentValue={config[key] ?? ""}
            label={meta.label}
            description={meta.desc}
            suffix={meta.suffix}
          />
        ))}
      </div>
    </div>
  );
}
