"use client";

import { useState } from "react";
import { Rss, Users } from "lucide-react";
import Link from "next/link";
import { PostCard } from "./PostCard";
import { NewPostForm } from "./NewPostForm";

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

  function handlePost(newPost: any) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

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
        </div>
      )}
    </>
  );
}
