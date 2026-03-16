import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Rss } from "lucide-react";
import { FeedClient } from "./FeedClient";

export const dynamic = "force-dynamic";

const TOPIC_FILTERS = [
  { value: "all",        label: "All" },
  { value: "tips",       label: "Tips & Advice" },
  { value: "show_off",   label: "Show Off" },
  { value: "horse_care", label: "Horse Care" },
  { value: "ask",        label: "Ask the Community" },
  { value: "general",    label: "General" },
];

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string }>;
}) {
  const { topic = "all" } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", user.id).single();
    isAdmin = (profile as any)?.role === "admin";
  }

  // Initial posts fetch
  let query = (admin as any)
    .from("feed_posts")
    .select("id, body, topic, image_urls, like_count, comment_count, created_at, profiles:user_id(id, username, display_name, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(20);

  if (topic !== "all") query = (query as any).eq("topic", topic);

  const { data: posts } = await (query as any);

  // Fetch user's likes
  let likedIds = new Set<string>();
  if (user && posts?.length) {
    const { data: likes } = await admin
      .from("feed_likes")
      .select("post_id")
      .eq("user_id", user.id)
      .in("post_id", (posts as any[]).map((p: any) => p.id));
    likedIds = new Set((likes ?? []).map((l: any) => l.post_id));
  }

  const enriched = (posts ?? []).map((p: any) => ({ ...p, liked: likedIds.has(p.id) }));

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-navy" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          The Feed Room
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Tips, questions, and gear from the equestrian community.
        </p>
      </div>

      {/* Topic filter pills */}
      <div className="flex gap-1.5 flex-wrap mb-6">
        {TOPIC_FILTERS.map((f) => (
          <Link
            key={f.value}
            href={f.value === "all" ? "/feed" : `/feed?topic=${f.value}`}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              topic === f.value ? "bg-olive text-cream" : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      <FeedClient
        initialPosts={enriched}
        currentUserId={user?.id ?? null}
        isAdmin={isAdmin}
        topic={topic}
      />
    </div>
  );
}
