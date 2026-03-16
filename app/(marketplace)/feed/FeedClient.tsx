"use client";

import { useState, useCallback } from "react";
import { Rss, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { PostCard } from "./PostCard";
import { NewPostForm } from "./NewPostForm";

const PAGE_SIZE = 20;

interface FeedClientProps {
  initialPosts: any[];
  currentUserId: string | null;
  isAdmin: boolean;
  topic: string;
  view: string;
  isLoggedIn: boolean;
}

export function FeedClient({ initialPosts, currentUserId, isAdmin, topic, view, isLoggedIn }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [offset, setOffset] = useState(initialPosts.length);
  const [hasMore, setHasMore] = useState(initialPosts.length === PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);

  function handlePost(newPost: any) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  const loadMore = useCallback(async () => {
    setLoadingMore(true);
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      view,
    });
    if (topic !== "all") params.set("topic", topic);

    const res = await fetch(`/api/feed/posts?${params}`);
    const data = await res.json();
    if (res.ok) {
      setPosts((prev) => [...prev, ...(data.posts ?? [])]);
      setOffset((o) => o + (data.posts?.length ?? 0));
      setHasMore(data.hasMore ?? false);
    }
    setLoadingMore(false);
  }, [offset, topic, view]);

  // Empty state for Following tab
  if (view === "following" && posts.length === 0) {
    return (
      <div className="rounded-xl border border-border py-16 text-center">
        <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm font-medium text-muted-foreground mb-1">
          You're not following anyone yet.
        </p>
        <p className="text-xs text-muted-foreground">
          Visit a seller's profile and hit <strong>Follow</strong> to see their posts here.
        </p>
        <Link href="/listings" className="mt-4 inline-block text-xs text-olive hover:underline">
          Browse sellers →
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="text-xs text-muted-foreground mb-3">
        🐴 Keep it community — no advertisements or spam allowed.
      </p>

      {currentUserId && view !== "following" && (
        <NewPostForm userId={currentUserId} onPost={handlePost} />
      )}

      {posts.length === 0 ? (
        <div className="rounded-xl border border-border py-16 text-center">
          <Rss className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No posts yet — be the first to share something!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onDelete={handleDelete}
            />
          ))}

          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-navy transition-colors disabled:opacity-50"
              >
                {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                {loadingMore ? "Loading…" : "Load more posts"}
              </button>
            </div>
          )}
        </div>
      )}

    </>
  );
}
