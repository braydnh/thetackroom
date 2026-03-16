"use client";

import { useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

interface Comment {
  id: string;
  body: string;
  created_at: string;
  profiles: { id: string; username: string; display_name: string | null } | null;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  isAdmin: boolean;
}

export function CommentSection({ postId, initialComments, currentUserId, isAdmin }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    const res = await fetch(`/api/feed/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((c) => [...c, data.comment]);
      setBody("");
    } else {
      toast.error(data.error ?? "Failed to post comment");
    }
    setSubmitting(false);
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId);
    const res = await fetch(`/api/feed/posts/${postId}/comments?comment_id=${commentId}`, { method: "DELETE" });
    if (res.ok) {
      setComments((c) => c.filter((x) => x.id !== commentId));
    } else {
      toast.error("Failed to delete comment");
    }
    setDeletingId(null);
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      )}
      {comments.map((comment) => {
        const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        const canDelete = isAdmin || currentUserId === profile?.id;
        return (
          <div key={comment.id} className="flex items-start gap-2 group">
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <Link href={`/profile/${profile?.username}`} className="text-xs font-semibold text-navy hover:underline">
                  {profile?.display_name ?? profile?.username ?? "user"}
                </Link>
                <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
              </div>
              <p className="text-sm text-navy/80 mt-0.5">{comment.body}</p>
            </div>
            {canDelete && (
              <button
                onClick={() => deleteComment(comment.id)}
                disabled={deletingId === comment.id}
                className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all flex-shrink-0 mt-0.5"
              >
                {deletingId === comment.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
              </button>
            )}
          </div>
        );
      })}

      {currentUserId ? (
        <form onSubmit={submit} className="flex gap-2 mt-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 text-sm rounded-lg border border-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive/40 bg-cream/50"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="text-sm font-medium px-3 py-1.5 rounded-lg bg-olive text-cream disabled:opacity-50 hover:bg-olive/90 transition-colors"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
          </button>
        </form>
      ) : (
        <Link href="/login" className="text-xs text-olive hover:underline">Log in to comment</Link>
      )}
    </div>
  );
}
