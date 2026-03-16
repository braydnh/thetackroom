"use client";

import { useState } from "react";
import { Loader2, Trash2, CornerDownRight } from "lucide-react";
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
  parent_id: string | null;
  profiles: { id: string; username: string; display_name: string | null } | null;
}

interface CommentSectionProps {
  postId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  isAdmin: boolean;
  onCountChange: (delta: number) => void;
}

interface CommentInputProps {
  onSubmit: (body: string) => Promise<void>;
  placeholder?: string;
  autoFocus?: boolean;
  onCancel?: () => void;
}

function CommentInput({ onSubmit, placeholder = "Add a comment…", autoFocus, onCancel }: CommentInputProps) {
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    await onSubmit(body.trim());
    setBody("");
    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        maxLength={500}
        autoFocus={autoFocus}
        className="flex-1 text-sm rounded-lg border border-border px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-olive/40 bg-cream/50"
      />
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-xs text-muted-foreground hover:text-navy px-1">
          Cancel
        </button>
      )}
      <button
        type="submit"
        disabled={submitting || !body.trim()}
        className="text-sm font-medium px-3 py-1.5 rounded-lg bg-olive text-cream disabled:opacity-50 hover:bg-olive/90 transition-colors"
      >
        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Post"}
      </button>
    </form>
  );
}

export function CommentSection({ postId, initialComments, currentUserId, isAdmin, onCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);

  // Top-level comments only
  const topLevel = comments.filter((c) => !c.parent_id);

  // Replies grouped by parent
  const replies: Record<string, Comment[]> = {};
  comments.forEach((c) => {
    if (c.parent_id) {
      replies[c.parent_id] = [...(replies[c.parent_id] ?? []), c];
    }
  });

  async function submitComment(body: string, parentId?: string) {
    const res = await fetch(`/api/feed/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, parent_id: parentId ?? null }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((c) => [...c, data.comment]);
      onCountChange(1);
      setReplyingToId(null);
    } else {
      toast.error(data.error ?? "Failed to post comment");
    }
  }

  async function deleteComment(commentId: string) {
    setDeletingId(commentId);
    const res = await fetch(`/api/feed/posts/${postId}/comments?comment_id=${commentId}`, { method: "DELETE" });
    if (res.ok) {
      // Remove comment and all its replies
      const toRemove = new Set([commentId, ...comments.filter((c) => c.parent_id === commentId).map((c) => c.id)]);
      const removed = comments.filter((c) => toRemove.has(c.id)).length;
      setComments((c) => c.filter((x) => !toRemove.has(x.id)));
      onCountChange(-removed);
    } else {
      toast.error("Failed to delete comment");
    }
    setDeletingId(null);
  }

  function renderComment(comment: Comment, isReply = false) {
    const profile = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
    const canDelete = isAdmin || currentUserId === profile?.id;
    const commentReplies = replies[comment.id] ?? [];

    return (
      <div key={comment.id} className={isReply ? "ml-6 border-l-2 border-border pl-3" : ""}>
        <div className="flex items-start gap-2 group">
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-1.5 flex-wrap">
              <Link href={`/profile/${profile?.username}`} className="text-xs font-semibold text-navy hover:underline">
                {profile?.display_name ?? profile?.username ?? "user"}
              </Link>
              <span className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</span>
            </div>
            <p className="text-sm text-navy/80 mt-0.5">{comment.body}</p>
            {!isReply && currentUserId && (
              <button
                onClick={() => setReplyingToId(replyingToId === comment.id ? null : comment.id)}
                className="text-xs text-muted-foreground hover:text-olive mt-0.5 transition-colors"
              >
                {replyingToId === comment.id ? "Cancel" : "Reply"}
              </button>
            )}
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

        {/* Replies */}
        {commentReplies.length > 0 && (
          <div className="mt-2 space-y-2">
            {commentReplies.map((reply) => renderComment(reply, true))}
          </div>
        )}

        {/* Reply input */}
        {replyingToId === comment.id && (
          <div className="mt-2 ml-6">
            <CommentInput
              placeholder={`Reply to ${profile?.display_name ?? profile?.username ?? "user"}…`}
              autoFocus
              onSubmit={(body) => submitComment(body, comment.id)}
              onCancel={() => setReplyingToId(null)}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {topLevel.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet.</p>
      )}

      {topLevel.map((comment) => renderComment(comment))}

      {currentUserId ? (
        <CommentInput onSubmit={(body) => submitComment(body)} />
      ) : (
        <Link href="/login" className="text-xs text-olive hover:underline">Log in to comment</Link>
      )}
    </div>
  );
}
