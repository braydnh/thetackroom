"use client";

import { useState } from "react";
import { MessageCircle, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { CommentSection } from "./CommentSection";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending:      { label: "Pending",      color: "bg-muted text-muted-foreground" },
  under_review: { label: "Under Review", color: "bg-amber-100 text-amber-700" },
  planned:      { label: "Planned",      color: "bg-sky-100 text-sky-700" },
  in_progress:  { label: "In Progress",  color: "bg-olive/10 text-olive" },
  done:         { label: "Done ✓",       color: "bg-emerald-100 text-emerald-700" },
  rejected:     { label: "Rejected",     color: "bg-red-100 text-red-700" },
};

interface RequestCardProps {
  request: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    vote_count: number;
    created_at: string;
    userVote: number | null;
    commentCount: number;
    profiles: { username: string; avatar_url: string | null } | null;
  };
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

export function RequestCard({ request: initial, currentUserId, isAdmin }: RequestCardProps) {
  const [voteCount, setVoteCount] = useState(initial.vote_count);
  const [userVote, setUserVote] = useState<number | null>(initial.userVote);
  const [voteLoading, setVoteLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [comments, setComments] = useState<any[] | null>(null);
  const [loadingComments, setLoadingComments] = useState(false);
  const [status, setStatus] = useState(initial.status);
  const [statusLoading, setStatusLoading] = useState(false);

  const profile = Array.isArray(initial.profiles) ? initial.profiles[0] : initial.profiles;
  const statusInfo = STATUS_LABELS[status] ?? STATUS_LABELS.pending;

  async function vote(value: 1 | -1) {
    if (!currentUserId) {
      toast.error("Log in to vote");
      return;
    }
    setVoteLoading(true);
    const res = await fetch(`/api/feature-requests/${initial.id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    const data = await res.json();
    if (res.ok) {
      setVoteCount(data.vote_count);
      setUserVote(data.userVote);
    }
    setVoteLoading(false);
  }

  async function toggleComments() {
    if (!expanded && comments === null) {
      setLoadingComments(true);
      const res = await fetch(`/api/feature-requests/${initial.id}/comments`);
      const data = await res.json();
      setComments(data.comments ?? []);
      setLoadingComments(false);
    }
    setExpanded((v) => !v);
  }

  async function updateStatus(newStatus: string) {
    setStatusLoading(true);
    const res = await fetch(`/api/feature-requests/${initial.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      setStatus(newStatus);
      toast.success("Status updated");
    }
    setStatusLoading(false);
  }

  return (
    <div className="rounded-xl border border-border bg-white px-5 py-4">
      <div className="flex gap-4">
        {/* Vote column */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0">
          <button
            onClick={() => vote(1)}
            disabled={voteLoading}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors border ${
              userVote === 1
                ? "bg-olive text-cream border-olive"
                : "border-border text-muted-foreground hover:border-olive hover:text-olive"
            }`}
            aria-label="Yay"
          >
            {voteLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span className="text-base leading-none">🐴</span>}
            <span>Yay</span>
          </button>
          <span className="text-sm font-bold text-navy tabular-nums">{voteCount}</span>
          <button
            onClick={() => vote(-1)}
            disabled={voteLoading}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors border ${
              userVote === -1
                ? "bg-red-500 text-white border-red-500"
                : "border-border text-muted-foreground hover:border-red-400 hover:text-red-500"
            }`}
            aria-label="Neigh"
          >
            <span className="text-base leading-none">🙅</span>
            <span>Neigh</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-navy leading-snug">{initial.title}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium flex-shrink-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          {initial.description && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{initial.description}</p>
          )}
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-xs text-muted-foreground">
              by <Link href={`/profile/${profile?.username}`} className="hover:underline text-olive">{profile?.username ?? "user"}</Link>
              {" · "}{timeAgo(initial.created_at)}
            </span>
            <button
              onClick={toggleComments}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-navy transition-colors"
            >
              {loadingComments ? <Loader2 className="h-3 w-3 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
              {initial.commentCount} {initial.commentCount === 1 ? "comment" : "comments"}
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            {/* Admin status selector */}
            {isAdmin && (
              <select
                value={status}
                onChange={(e) => updateStatus(e.target.value)}
                disabled={statusLoading}
                className="ml-auto text-xs border border-border rounded px-2 py-0.5 bg-white text-navy focus:outline-none focus:ring-1 focus:ring-olive/30"
              >
                <option value="pending">Pending</option>
                <option value="under_review">Under Review</option>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="done">Done</option>
                <option value="rejected">Rejected</option>
              </select>
            )}
          </div>

          {expanded && comments !== null && (
            <CommentSection
              requestId={initial.id}
              initialComments={comments}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </div>
    </div>
  );
}
