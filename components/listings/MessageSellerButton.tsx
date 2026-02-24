"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessageCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface MessageSellerButtonProps {
  sellerId: string;
  listingId: string;
  className?: string;
}

export function MessageSellerButton({ sellerId, listingId, className }: MessageSellerButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleClick() {
    setLoading(true);
    const res = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seller_id: sellerId, listing_id: listingId }),
    });

    if (res.status === 401) {
      router.push(`/login?next=/listings/${listingId}`);
      return;
    }

    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Couldn't start conversation");
      setLoading(false);
      return;
    }

    router.push(`/messages/${data.conversation_id}`);
  }

  return (
    <Button variant="outline" className={`gap-2 ${className ?? ""}`} onClick={handleClick} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
      Message
    </Button>
  );
}
