import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect, notFound } from "next/navigation";
import EditListingForm from "./EditListingForm";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/selling/listings/${id}/edit`);

  const admin = createAdminClient();

  const { data: listing } = await admin
    .from("listings")
    .select("id, title, description, price, condition, category, subcategory, brand, size, status, allows_shipping, allows_pickup, shipping_price, shipping_notes, seller_id, listing_images(id, display_url, storage_path, sort_order, is_primary)")
    .eq("id", id)
    .single();

  if (!listing) notFound();
  if ((listing as any).seller_id !== user.id) notFound();

  // Status guard — don't allow editing sold/cancelled listings
  const status = (listing as any).status as string;
  if (status === "sold" || status === "cancelled" || status === "deleted") {
    redirect(`/listings/${id}`);
  }

  return <EditListingForm listing={listing as any} />;
}
