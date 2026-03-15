import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const sellerId = searchParams.get("seller_id");

  if (!sellerId) return NextResponse.json({ error: "seller_id required" }, { status: 400 });

  const admin = createAdminClient() as any;

  const { data: listings } = await admin
    .from("listings")
    .select("id, title, price, primary_image_url")
    .eq("seller_id", sellerId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ listings: listings ?? [] });
}
