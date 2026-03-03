import { createAdminClient } from "@/lib/supabase/admin";
import { FoundingSellerImport } from "./FoundingSellerImport";

export default async function FoundingSellersPage() {
  const admin = createAdminClient();

  const { data: imported } = await admin
    .from("founding_sellers_import")
    .select("id, email, imported_at, matched_at")
    .order("imported_at", { ascending: false })
    .limit(100);

  const matched = (imported ?? []).filter((r: any) => r.matched_at).length;

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-2"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Founding Sellers
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Import email addresses to grant Founding Seller status. When a user signs up with a matching email, they automatically receive the badge.
        <br />
        <strong className="text-navy">{matched}</strong> of <strong className="text-navy">{(imported ?? []).length}</strong> imported emails have been matched.
      </p>

      <FoundingSellerImport />

      {/* Import list */}
      {(imported ?? []).length > 0 && (
        <div className="mt-8 rounded-xl border border-border overflow-hidden divide-y divide-border">
          <div className="px-5 py-3 bg-white border-b border-border">
            <p className="text-sm font-semibold text-navy">Imported Emails</p>
          </div>
          {(imported as any[]).map((row) => (
            <div key={row.id} className="flex items-center justify-between px-5 py-3 bg-white text-sm">
              <span className="text-navy font-mono">{row.email}</span>
              <span className={row.matched_at ? "text-emerald-600 text-xs" : "text-muted-foreground text-xs"}>
                {row.matched_at
                  ? `Matched ${new Date(row.matched_at).toLocaleDateString("en-AU")}`
                  : "Pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
