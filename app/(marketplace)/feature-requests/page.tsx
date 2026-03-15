import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { RequestCard } from "./RequestCard";
import { NewRequestForm } from "./NewRequestForm";
import { Lightbulb } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "under_review", label: "Under Review" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
];

export default async function FeatureRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; status?: string }>;
}) {
  const { sort = "top", status = "all" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = (profile as any)?.role === "admin";
  }

  // Fetch requests
  let query = admin
    .from("feature_requests")
    .select("id, title, description, status, vote_count, created_at, user_id, profiles!user_id(username, avatar_url)");

  if (status !== "all") query = (query as any).eq("status", status);
  if (sort === "top") {
    query = (query as any).order("vote_count", { ascending: false }).order("created_at", { ascending: false });
  } else {
    query = (query as any).order("created_at", { ascending: false });
  }

  const { data: requests } = await (query as any).limit(50);

  // Fetch user votes
  let userVotes: Record<string, number> = {};
  if (user && requests?.length) {
    const { data: votes } = await admin
      .from("feature_request_votes")
      .select("request_id, value")
      .eq("user_id", user.id)
      .in("request_id", (requests as any[]).map((r) => r.id));
    (votes ?? []).forEach((v: any) => { userVotes[v.request_id] = v.value; });
  }

  // Fetch comment counts
  const commentCounts: Record<string, number> = {};
  if (requests?.length) {
    const { data: counts } = await admin
      .from("feature_request_comments")
      .select("request_id")
      .in("request_id", (requests as any[]).map((r) => r.id));
    (counts ?? []).forEach((c: any) => {
      commentCounts[c.request_id] = (commentCounts[c.request_id] ?? 0) + 1;
    });
  }

  const enriched = (requests as any[] ?? []).map((r) => ({
    ...r,
    userVote: userVotes[r.id] ?? null,
    commentCount: commentCounts[r.id] ?? 0,
  }));

  function tabUrl(s: string) {
    const p = new URLSearchParams({ sort, status: s });
    return `/feature-requests?${p}`;
  }
  function sortUrl(s: string) {
    const p = new URLSearchParams({ sort: s, status });
    return `/feature-requests?${p}`;
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            Request a Feature
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Got an idea? Share it with the community and vote on what gets built next.
          </p>
        </div>
        {user ? (
          <NewRequestForm />
        ) : (
          <Link
            href="/login?next=/feature-requests"
            className="text-sm text-olive hover:underline"
          >
            Log in to submit →
          </Link>
        )}
      </div>

      {/* Sort + Status filters */}
      <div className="flex items-center justify-between gap-3 mt-6 mb-4 flex-wrap">
        <div className="flex gap-1 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.value}
              href={tabUrl(f.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
                status === f.value ? "bg-olive text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>
        <div className="flex gap-1">
          {[{ value: "top", label: "Top" }, { value: "new", label: "Newest" }].map((s) => (
            <Link
              key={s.value}
              href={sortUrl(s.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                sort === s.value ? "bg-navy text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Request list */}
      {enriched.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center">
          <Lightbulb className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No requests yet — be the first to suggest something!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {enriched.map((request) => (
            <RequestCard
              key={request.id}
              request={request}
              currentUserId={user?.id ?? null}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </div>
  );
}
