import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://thetackroom.com.au";

  const admin = createAdminClient();

  // Fetch active listing IDs
  const { data: listings } = await admin
    .from("listings")
    .select("id, updated_at")
    .eq("status", "active")
    .limit(1000);

  const listingUrls = (listings ?? []).map((l: any) => ({
    url: `${base}/listings/${l.id}`,
    lastModified: new Date(l.updated_at),
    changeFrequency: "daily" as const,
    priority: 0.8,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: "hourly", priority: 1 },
    { url: `${base}/listings`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/listings?category=horse`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    { url: `${base}/listings?category=rider`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
    ...listingUrls,
  ];
}
