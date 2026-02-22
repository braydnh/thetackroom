import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { AmbassadorActionButtons } from "./AmbassadorActionButtons";
import { Star } from "lucide-react";

export default async function AdminAmbassadorsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") redirect("/");

  const { status = "pending" } = await searchParams;

  const { data: rawApps } = await admin
    .from("ambassador_applications")
    .select("id, motivation, instagram_handle, tiktok_handle, facebook_url, follower_count, status, admin_note, created_at, profiles!user_id(username, display_name, avatar_url)")
    .eq("status", status as "pending" | "approved" | "denied")
    .order("created_at", { ascending: true });

  const apps = (rawApps ?? []) as any[];

  const tabs = [
    { label: "Pending", value: "pending" },
    { label: "Approved", value: "approved" },
    { label: "Denied", value: "denied" },
  ];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Star className="h-5 w-5 text-olive" />
        <h1 className="text-xl font-bold text-navy">Ambassador Applications</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <a
            key={tab.value}
            href={`/admin/ambassadors?status=${tab.value}`}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              status === tab.value
                ? "border-olive text-olive"
                : "border-transparent text-muted-foreground hover:text-navy"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      {apps.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center text-muted-foreground text-sm">
          No {status} applications.
        </div>
      ) : (
        <div className="space-y-4">
          {apps.map((app) => {
            const p = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles;
            return (
              <div key={app.id} className="rounded-xl border border-border bg-white p-5">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    {p?.avatar_url ? (
                      <img src={p.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold text-muted-foreground">
                        {p?.username?.[0]?.toUpperCase() ?? "?"}
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-navy">{p?.display_name ?? p?.username}</p>
                      <p className="text-xs text-muted-foreground">@{p?.username}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{new Date(app.created_at).toLocaleDateString("en-AU")}</p>
                </div>

                <div className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  <p className="font-medium text-navy mb-1">Motivation</p>
                  <p>{app.motivation}</p>
                </div>

                {(app.instagram_handle || app.tiktok_handle || app.facebook_url || app.follower_count) && (
                  <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {app.instagram_handle && <span>Instagram: {app.instagram_handle}</span>}
                    {app.tiktok_handle && <span>TikTok: {app.tiktok_handle}</span>}
                    {app.facebook_url && <span>Facebook: {app.facebook_url}</span>}
                    {app.follower_count && <span>~{app.follower_count.toLocaleString()} followers</span>}
                  </div>
                )}

                {app.admin_note && (
                  <p className="mt-3 text-xs bg-muted/50 rounded px-3 py-2 text-muted-foreground">
                    Note: {app.admin_note}
                  </p>
                )}

                {status === "pending" && (
                  <div className="mt-4">
                    <AmbassadorActionButtons applicationId={app.id} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
