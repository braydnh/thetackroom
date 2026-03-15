import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import NewListingForm from "./NewListingForm";

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/selling/listings/new");

  const admin = createAdminClient();

  const [{ data: profile }, { data: configRows }] = await Promise.all([
    supabase.from("profiles").select("stripe_onboarding_complete, role, is_ambassador").eq("id", user.id).single(),
    admin.from("platform_config").select("key, value").in("key", ["commission_pct", "ambassador_commission_pct", "admin_commission_pct"]),
  ]);

  if (!profile?.stripe_onboarding_complete && (profile as any)?.role !== "admin") {
    redirect("/selling/onboarding");
  }

  const cfg = Object.fromEntries((configRows ?? []).map((r: any) => [r.key, parseFloat(r.value)]));
  const commissionPct =
    (profile as any).role === "admin" ? (cfg.admin_commission_pct ?? 0) :
    (profile as any).is_ambassador ? (cfg.ambassador_commission_pct ?? 5) :
    (cfg.commission_pct ?? 5);

  return <NewListingForm commissionPct={commissionPct} />;
}
