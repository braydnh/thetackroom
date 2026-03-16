"use client";

import { useState } from "react";
import { Loader2, UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  initialFollowerCount: number;
}

export function FollowButton({ userId, initialIsFollowing, initialFollowerCount }: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch(`/api/follow/${userId}`, { method: "POST" });
    if (res.status === 401) {
      toast.error("Log in to follow sellers");
      setLoading(false);
      return;
    }
    const data = await res.json();
    if (res.ok) {
      setIsFollowing(data.isFollowing);
      setFollowerCount((c) => data.isFollowing ? c + 1 : Math.max(0, c - 1));
      toast.success(data.isFollowing ? "Following!" : "Unfollowed");
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">
        <strong className="text-navy">{followerCount}</strong> {followerCount === 1 ? "follower" : "followers"}
      </span>
      <Button
        size="sm"
        variant={isFollowing ? "outline" : "default"}
        className={isFollowing
          ? "gap-1.5 border-olive text-olive hover:bg-red-50 hover:text-red-500 hover:border-red-300"
          : "gap-1.5 bg-olive text-cream hover:bg-olive/90"
        }
        onClick={toggle}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : isFollowing ? (
          <><UserCheck className="h-3.5 w-3.5" /> Following</>
        ) : (
          <><UserPlus className="h-3.5 w-3.5" /> Follow</>
        )}
      </Button>
    </div>
  );
}
