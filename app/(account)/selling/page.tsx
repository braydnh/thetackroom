import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatAUD } from "@/lib/utils/currency";
import {
  Plus, Package, Banknote, Zap, Star, AlertCircle,
  CheckCircle, Clock, Eye, Heart, ChevronRight, Hourglass,
} from "lucide-react";

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:    { label: "Active",    color: "bg-emerald-100 text-emerald-700" },
  draft:     { label: "Draft",     color: "bg-muted text-muted-foreground" },
  reserved:  { label: "Reserved",  color: "bg-amber-100 text-amber-700" },
  sold:      { label: "Sold",      color: "bg-sky-100 text-sky-700" },
  suspended: { label: "Suspended", color: "bg-red-100 text-red-700" },
};

export default async function SellerDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Load profile + listings in parallel
  const [{ data: profile }, { data: listings }] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, display_name, avatar_url, stripe_account_id, stripe_onboarding_complete, total_sales, average_rating, is_founding_seller")
      .eq("id", user.id)
      .single(),
    supabase
      .from("listings")
      .select("id, title, price, status, view_count, favourite_count, created_at, listing_images(display_url, is_primary, sort_order)")
      .eq("seller_id", user.id)
      .neq("status", "deleted")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (!profile) redirect("/settings?setup=1");

  const isOnboarded = profile.stripe_onboarding_complete;
  const isPending = !isOnboarded && !!profile.stripe_account_id;
  const activeListings = (listings ?? []).filter((l: any) => l.status === "active");
  const soldListings   = (listings ?? []).filter((l: any) => l.status === "sold");

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Seller Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {profile.display_name ?? profile.username}
            {profile.is_founding_seller && (
              <span className="ml-2 inline-flex items-center gap-0.5 rounded-full bg-olive/10 px-2 py-0.5 text-[10px] font-semibold text-olive">
                <Star className="h-2.5 w-2.5" /> Founding Seller
              </span>
            )}
          </p>
        </div>
        {isOnboarded && (
          <Button className="bg-olive hover:bg-olive-light text-cream gap-2" asChild>
            <Link href="/selling/listings/new">
              <Plus className="h-4 w-4" /> New Listing
            </Link>
          </Button>
        )}
      </div>

      {/* ── Stripe Connect banner ── */}
      {isPending && (
        <div className="mb-6 rounded-xl border-2 border-sky-200 bg-sky-50 p-5 flex items-start gap-4">
          <Hourglass className="h-5 w-5 text-sky-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sky-900">Account verification in progress</p>
            <p className="text-sm text-sky-700 mt-1">
              Stripe is reviewing your details. This usually takes a few minutes — your dashboard will update automatically once approved.
            </p>
          </div>
        </div>
      )}
      {!isOnboarded && !isPending && (
        <div className="mb-6 rounded-xl border-2 border-amber-200 bg-amber-50 p-5 flex items-start gap-4">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-amber-900">Connect your bank account to start selling</p>
            <p className="text-sm text-amber-700 mt-1">
              You need to set up Stripe payments before you can publish listings or receive payouts.
            </p>
          </div>
          <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white flex-shrink-0" asChild>
            <Link href="/selling/onboarding">Set up now</Link>
          </Button>
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {[
          { label: "Active listings", value: activeListings.length, icon: Package },
          { label: "Total sold",      value: profile.total_sales,   icon: Banknote },
          { label: "Avg. rating",
            value: profile.average_rating ? `${Number(profile.average_rating).toFixed(1)} ★` : "–",
            icon: Star },
          { label: "Account status",
            value: isOnboarded ? "Ready" : isPending ? "Pending" : "Setup needed",
            icon: isOnboarded ? CheckCircle : isPending ? Clock : AlertCircle,
            accent: isOnboarded ? "text-emerald-600" : isPending ? "text-sky-600" : "text-amber-600" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border bg-white p-4">
            <stat.icon className={`h-4 w-4 mb-2 ${stat.accent ?? "text-olive"}`} />
            <p className={`text-lg font-bold ${stat.accent ?? "text-navy"}`}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Listings table ── */}
      <div className="rounded-xl border border-border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white">
          <h2 className="font-semibold text-navy">Your Listings</h2>
          {isOnboarded && (
            <Button size="sm" variant="outline" className="gap-1.5" asChild>
              <Link href="/selling/listings/new">
                <Plus className="h-3.5 w-3.5" /> Add
              </Link>
            </Button>
          )}
        </div>

        {(listings ?? []).length === 0 ? (
          <div className="py-16 text-center">
            <Package className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No listings yet</p>
            {isOnboarded && (
              <Button className="mt-4 bg-olive hover:bg-olive-light text-cream" asChild>
                <Link href="/selling/listings/new">List your first item</Link>
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {(listings as any[]).map((listing) => {
              const images = (listing.listing_images ?? []) as { display_url: string; is_primary: boolean; sort_order: number }[];
              const thumb = images.find((i) => i.is_primary)?.display_url
                ?? images.sort((a, b) => a.sort_order - b.sort_order)[0]?.display_url
                ?? null;
              const meta = STATUS_META[listing.status] ?? STATUS_META.draft;

              return (
                <div key={listing.id} className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-stone-50 transition-colors">
                  {/* Thumbnail */}
                  <div className="h-14 w-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {thumb ? (
                      <Image src={thumb} alt="" width={56} height={56} className="object-cover h-full w-full" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <span className="text-xl opacity-20">🐴</span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link
                        href={`/listings/${listing.id}`}
                        className="text-sm font-medium text-navy hover:underline truncate max-w-[200px] sm:max-w-xs"
                      >
                        {listing.title}
                      </Link>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span>{formatAUD(listing.price)}</span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-3 w-3" /> {listing.view_count}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Heart className="h-3 w-3" /> {listing.favourite_count}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {listing.status === "active" && (
                      <Button size="sm" variant="outline" className="gap-1 text-xs" asChild>
                        <Link href={`/selling/boost/${listing.id}`}>
                          <Zap className="h-3 w-3" /> Boost
                        </Link>
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" asChild>
                      <Link href={`/selling/listings/${listing.id}/edit`}>
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Quick links ── */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/orders"
          className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:border-olive transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Package className="h-5 w-5 text-olive" />
            <div>
              <p className="text-sm font-medium text-navy">My Orders</p>
              <p className="text-xs text-muted-foreground">Track sales &amp; shipments</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-olive transition-colors" />
        </Link>

        <Link
          href="/settings"
          className="flex items-center justify-between rounded-xl border border-border bg-white p-4 hover:border-olive transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Banknote className="h-5 w-5 text-olive" />
            <div>
              <p className="text-sm font-medium text-navy">Payout Settings</p>
              <p className="text-xs text-muted-foreground">Manage your Stripe account</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-olive transition-colors" />
        </Link>
      </div>
    </div>
  );
}
