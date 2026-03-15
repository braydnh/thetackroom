"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2 } from "lucide-react";
import Link from "next/link";

interface Comment {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
}

interface Props {
  requestId: string;
  initialComments: Comment[];
  currentUserId: string | null;
  isAdmin: boolean;
}

function timeAgo(date: string) {
  const secs = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (secs < 60) return "just now";
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export function CommentSection({ requestId, initialComments, currentUserId, isAdmin }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setLoading(true);
    const res = await fetch(`/api/feature-requests/${requestId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const data = await res.json();
    if (res.ok) {
      setComments((prev) => [...prev, data.comment]);
      setBody("");
    }
    setLoading(false);
  }

  async function deleteComment(commentId: string) {
    await fetch(`/api/feature-requests/${requestId}/comments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ commentId }),
    });
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }

  return (
    <div className="mt-4 pt-4 border-t border-border space-y-3">
      {comments.length === 0 && (
        <p className="text-xs text-muted-foreground">No comments yet — be the first!</p>
      )}
      {comments.map((c) => {
        const profile = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return (
          <div key={c.id} className="flex gap-2">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover flex-shrink-0 mt-0.5" />
            ) : (
              <div className="h-6 w-6 rounded-full bg-olive/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-[9px] font-bold text-olive">{profile?.username?.[0]?.toUpperCase()}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-medium text-navy">{profile?.username ?? "user"}</span>
                <span className="text-[10px] text-muted-foreground">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-sm text-navy/80 mt-0.5">{c.body}</p>
            </div>
            {(isAdmin || c.user_id === currentUserId) && (
              <button
                onClick={() => deleteComment(c.id)}
                className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                aria-label="Delete comment"
              >
                <Trash2 className="h-3.5 w-3.5" />
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
            className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-olive/30"
          />
          <Button type="submit" size="sm" className="bg-olive hover:bg-olive-light text-cream h-8 px-3" disabled={loading || !body.trim()}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
          </Button>
        </form>
      ) : (
        <Link href="/login?next=/feature-requests" className="text-xs text-olive hover:underline">
          Log in to comment
        </Link>
      )}
    </div>
  );
}
