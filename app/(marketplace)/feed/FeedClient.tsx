"use client";

import { useState } from "react";
import { Rss } from "lucide-react";
import { PostCard } from "./PostCard";
import { NewPostForm } from "./NewPostForm";

interface FeedClientProps {
  initialPosts: any[];
  currentUserId: string | null;
  isAdmin: boolean;
  topic: string;
}

export function FeedClient({ initialPosts, currentUserId, isAdmin, topic }: FeedClientProps) {
  const [posts, setPosts] = useState(initialPosts);

  function handlePost(newPost: any) {
    setPosts((prev) => [newPost, ...prev]);
  }

  function handleDelete(id: string) {
    setPosts((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <>
      {currentUserId && (
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
