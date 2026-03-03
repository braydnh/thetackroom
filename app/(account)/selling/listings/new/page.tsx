import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import NewListingForm from "./NewListingForm";

export default async function NewListingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/selling/listings/new");

  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_onboarding_complete")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_onboarding_complete) {
    redirect("/selling/onboarding");
  }

  return <NewListingForm />;
}
