import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { CouponManager } from "./CouponManager";
import { Tag } from "lucide-react";

export default async function AdminCouponsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { data: coupons } = await admin
    .from("coupon_codes")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Tag className="h-5 w-5 text-olive" />
        <h1 className="text-xl font-bold text-navy">Coupon Codes</h1>
      </div>
      <CouponManager initialCoupons={coupons ?? []} />
    </div>
  );
}
