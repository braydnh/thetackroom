"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Send, Loader2, ShieldAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const OFF_PLATFORM_PATTERNS = [
  /\bcash\b/i,
  /\bpayid\b/i,
  /\bpay\s+id\b/i,
  /\bbsb\b/i,
  /\bbank\s+transfer\b/i,
  /\bbank\s+account\b/i,
  /\bbank\s+deposit\b/i,
  /\beft\b/i,
  /\bvenmo\b/i,
  /\bwestern\s+union\b/i,
  /\bmoneygram\b/i,
  /\b04\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/, // Australian mobile numbers
  /\b\d{10,}\b/, // 10+ consecutive digits (account/BSB combos)
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/, // email addresses
];

function containsOffPlatformKeywords(text: string): boolean {
  return OFF_PLATFORM_PATTERNS.some((p) => p.test(text));
}

interface Message {
  id: string;
  body: string;
  sender_id: string;
  created_at: string;
  read_at: string | null;
}

interface ConversationMeta {
  id: string;
  listing_id: string | null;
  buyer_id: string;
  seller_id: string;
  other_username: string;
  other_avatar: string | null;
  listing_title: string | null;
  listing_image: string | null;
  listing_price: number | null;
  current_user_id: string;
}

export default function MessageThreadPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const supabase = createClient();

  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadThread = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Load conversation
    const { data: convo } = await supabase
      .from("conversations")
      .select("id, listing_id, buyer_id, seller_id")
      .eq("id", id)
      .single();

    if (!convo) { router.push("/messages"); return; }
    if (convo.buyer_id !== user.id && convo.seller_id !== user.id) {
      router.push("/messages"); return;
    }

    const otherPartyId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;

    // Load other party profile
    const { data: other } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", otherPartyId)
      .single();

    // Load listing info
    let listingTitle: string | null = null;
    let listingImage: string | null = null;
    let listingPrice: number | null = null;
    if (convo.listing_id) {
      const { data: listing } = await supabase
        .from("listings")
        .select("title, price, listing_images(display_url, is_primary, sort_order)")
        .eq("id", convo.listing_id)
        .single();
      if (listing) {
        const raw = listing as any;
        listingTitle = raw.title;
        listingPrice = raw.price;
        const imgs = (raw.listing_images ?? []).sort((a: any, b: any) => a.sort_order - b.sort_order);
        listingImage = imgs.find((i: any) => i.is_primary)?.display_url ?? imgs[0]?.display_url ?? null;
      }
    }

    setMeta({
      id: convo.id,
      listing_id: convo.listing_id,
      buyer_id: convo.buyer_id,
      seller_id: convo.seller_id,
      other_username: other?.username ?? "user",
      other_avatar: other?.avatar_url ?? null,
      listing_title: listingTitle,
      listing_image: listingImage,
      listing_price: listingPrice,
      current_user_id: user.id,
    });

    // Load messages
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, sender_id, created_at, read_at")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true })
      .limit(200);

    setMessages((msgs ?? []) as Message[]);
    setLoading(false);

    // Mark unread messages as read via admin API (bypasses RLS on read_at updates)
    fetch("/api/messages/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: id }),
    }).catch(() => {});
  }, [id, supabase, router]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useEffect(() => {
    if (!loading) scrollToBottom();
  }, [messages, loading]);

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel(`messages:${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Mark as read if it's from the other party
          if (meta && newMsg.sender_id !== meta.current_user_id) {
            fetch("/api/messages/read", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ conversation_id: id }),
            }).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [id, supabase, meta]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !meta || sending) return;

    const text = body.trim();
    setBody("");
    setSending(true);

    // Optimistically add the message immediately so the UI feels instant
    const tempId = `temp-${Date.now()}`;
    const optimistic: Message = {
      id: tempId,
      body: text,
      sender_id: meta.current_user_id,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    setMessages((prev) => [...prev, optimistic]);

    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversation_id: id, body: text }),
    });

    if (!res.ok) {
      // Roll back the optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setBody(text);
      const data = await res.json().catch(() => ({}));
      if (data.code === "CONTACT_INFO_DETECTED") {
        toast.error(data.error ?? "Contact details are not permitted in messages.");
      } else {
        toast.error(data.error ?? `Failed to send message (${res.status}). Please try again.`);
      }
    } else {
      // Swap the temp ID for the real DB ID so the Realtime dedup works correctly
      const data = await res.json().catch(() => ({}));
      if (data.id) {
        setMessages((prev) => prev.map((m) => m.id === tempId ? { ...m, id: data.id } : m));
      }
    }

    setSending(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!meta) return null;

  function formatTime(ts: string) {
    return new Date(ts).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" });
  }

  function formatDate(ts: string) {
    return new Date(ts).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
  }

  return (
    <div className="flex flex-col h-[calc(100vh-65px)]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3 border-b border-border bg-white flex-shrink-0">
        <Link href="/messages" className="text-muted-foreground hover:text-navy">
          <ChevronLeft className="h-5 w-5" />
        </Link>
        <div className="h-9 w-9 rounded-full bg-muted overflow-hidden flex-shrink-0">
          {meta.other_avatar ? (
            <Image src={meta.other_avatar} alt={meta.other_username} width={36} height={36} className="h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-olive/10">
              <span className="text-sm font-bold text-olive">{meta.other_username[0].toUpperCase()}</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-navy">@{meta.other_username}</p>
          {meta.listing_title && (
            <p className="text-xs text-muted-foreground truncate">{meta.listing_title}</p>
          )}
        </div>
        {meta.listing_id && (
          <Link href={`/listings/${meta.listing_id}`} className="flex-shrink-0">
            {meta.listing_image && (
              <div className="h-10 w-10 rounded-lg overflow-hidden bg-muted">
                <Image src={meta.listing_image} alt="" width={40} height={40} className="h-full w-full object-cover" />
              </div>
            )}
          </Link>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-1 bg-stone-50">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const isMe = msg.sender_id === meta.current_user_id;
          const prev = messages[i - 1];
          const showDate = !prev || formatDate(prev.created_at) !== formatDate(msg.created_at);

          return (
            <div key={msg.id}>
              {showDate && (
                <div className="flex justify-center my-3">
                  <span className="rounded-full bg-white border border-border px-3 py-1 text-[10px] text-muted-foreground">
                    {formatDate(msg.created_at)}
                  </span>
                </div>
              )}
              <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                <div className="flex flex-col max-w-[75%]">
                  <div
                    className={cn(
                      "rounded-2xl px-4 py-2 text-sm",
                      isMe
                        ? "bg-olive text-cream rounded-br-sm"
                        : "bg-white border border-border text-navy rounded-bl-sm"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                    <p className={cn("text-[10px] mt-1", isMe ? "text-cream/70 text-right" : "text-muted-foreground")}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                  {containsOffPlatformKeywords(msg.body) && (
                    <p className={cn("text-[10px] mt-1 flex items-center gap-0.5 text-amber-600", isMe ? "justify-end" : "justify-start")}>
                      <ShieldAlert className="h-2.5 w-2.5" /> Off-platform payment — not covered by buyer protection
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Off-platform payment warning banner */}
      {containsOffPlatformKeywords(body) && (
        <div className="flex items-start gap-2 px-4 sm:px-6 py-2.5 bg-amber-50 border-t border-amber-200 flex-shrink-0">
          <ShieldAlert className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Off-platform payments aren&apos;t covered by buyer protection. Keep your transaction on The Tack Room to stay safe.
          </p>
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex items-end gap-2 px-4 sm:px-6 py-3 border-t border-border bg-white flex-shrink-0"
      >
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e as any);
            }
          }}
          placeholder="Type a message…"
          rows={1}
          className="flex-1 resize-none rounded-xl border border-border bg-stone-50 px-4 py-3 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40 max-h-32 overflow-y-auto"
          style={{ minHeight: "44px" }}
        />
        <Button
          type="submit"
          size="icon"
          className="bg-olive hover:bg-olive-light text-cream flex-shrink-0 h-11 w-11 rounded-xl"
          disabled={!body.trim() || sending}
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
