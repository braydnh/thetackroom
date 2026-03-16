"use client";

import { useState } from "react";
import { Heart, MessageCircle, ChevronDown, ChevronUp, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { CommentSection } from "./CommentSection";

const TOPIC_LABELS: Record<string, string> = {
  tips:       "Tips & Advice",
  show_off:   "Show Off Your Gear",
  horse_care: "Horse Care",
  ask:        "Ask the Community",
  general:    "General",
};

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface Post {
  id: string;
  body: string;
  topic: string;
  image_urls: string[];
  like_count: number;
  comment_count: number;
  created_at: string;
  liked: boolean;
  profiles: { id: string; username: string; display_name: string | null; avatar_url: string | null } | null;
}

interface PostCardProps {
  post: Post;
  currentUserId: string | null;
  isAdmin: boolean;
  onDelete?: (id: string) => void;
}

export function PostCard({ post: initial, currentUserId, isAdmin, onDelete }: PostCardProps) {
  const [likeCount, setLikeCount] = useState(initial.like_count);
  const [liked, setLiked] = useState(initial.liked);
  const [commentCount, setCommentCount] = useState(initial.comment_count);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const profile = Array.isArray(initial.profiles) ? initial.profiles[0] : initial.profiles;

  // Optimistic like — update UI immediately, revert on error
  async function toggleLike() {
    if (!currentUserId) { toast.error("Log in to like posts"); return; }
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => wasLiked ? Math.max(0, c - 1) : c + 1);
    const res = await fetch(`/api/feed/posts/${initial.id}/like`, { method: "POST" });
    if (!res.ok) {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount((c) => wasLiked ? c + 1 : Math.max(0, c - 1));
    }
  }

  async function toggleComments() {
    if (!expanded && comments === null) {
      setLoadingComments(true);
      const res = await fetch(`/api/feed/posts/${initial.id}/comments`);
      const data = await res.json();
      const loaded = data.comments ?? [];
      setComments(loaded);
      setCommentCount(loaded.length);
      setLoadingComments(false);
    }
    setExpanded((v) => !v);
  }

  async function handleDelete() {
    if (!confirm("Delete this post?")) return;
    setDeleting(true);
    const res = await fetch(`/api/feed/posts/${initial.id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Post deleted");
      onDelete?.(initial.id);
    } else {
      toast.error("Failed to delete");
    }
    setDeleting(false);
  }

  return (
    <div className="rounded-xl border border-border bg-white p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5">
          <Link href={`/profile/${profile?.username}`}>
            {profile?.avatar_url ? (
              <Image src={profile.avatar_url} alt={profile.username ?? ""} width={36} height={36} className="rounded-full object-cover w-9 h-9" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-olive/20 flex items-center justify-center text-olive font-semibold text-sm">
                {(profile?.display_name ?? profile?.username ?? "?")[0].toUpperCase()}
              </div>
            )}
          </Link>
          <div>
            <Link href={`/profile/${profile?.username}`} className="text-sm font-semibold text-navy hover:underline">
              {profile?.display_name ?? profile?.username ?? "Unknown"}
            </Link>
            <p className="text-xs text-muted-foreground">{timeAgo(initial.created_at)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-olive/10 px-2.5 py-0.5 text-[10px] font-medium text-olive">
            {TOPIC_LABELS[initial.topic] ?? initial.topic}
          </span>
          {(isAdmin || currentUserId === profile?.id) && (
            <button onClick={handleDelete} disabled={deleting} className="text-muted-foreground hover:text-red-500 transition-colors">
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <p className="text-sm text-navy whitespace-pre-wrap break-words mb-3">{initial.body}</p>

      {/* Images */}
      {initial.image_urls.length > 0 && (
        <div className={`grid gap-2 mb-3 ${initial.image_urls.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {initial.image_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              <Image src={url} alt="" fill className="object-cover" sizes="(max-width: 768px) 50vw, 300px" />
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-red-500" : "text-muted-foreground hover:text-red-500"}`}
        >
          <Heart className={`h-4 w-4 ${liked ? "fill-red-500" : ""}`} />
          <span>{likeCount}</span>
        </button>
        <button
          onClick={toggleComments}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-navy transition-colors"
        >
          {loadingComments ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
          <span>{commentCount}</span>
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Comments */}
      {expanded && comments !== null && (
        <CommentSection
          postId={initial.id}
          initialComments={comments}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
        />
      )}
    </div>
  );
}
