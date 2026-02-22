import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ChevronRight } from "lucide-react";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/messages");

  const admin = createAdminClient();

  // Fetch conversations where user is buyer OR seller, ordered by most recent
  const { data: conversations } = await admin
    .from("conversations")
    .select("id, listing_id, buyer_id, seller_id, last_message_at, created_at")
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false })
    .limit(50);

  if (!conversations || conversations.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
        <h1
          className="text-2xl font-bold text-navy mb-6"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Messages
        </h1>
        <div className="rounded-xl border border-border py-16 text-center">
          <MessageCircle className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No messages yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Message a seller from any listing to get started.
          </p>
        </div>
      </div>
    );
  }

  // Fetch the other party profile + listing title for each conversation
  const otherPartyIds = conversations.map((c: any) =>
    c.buyer_id === user.id ? c.seller_id : c.buyer_id
  );
  const listingIds = conversations.map((c: any) => c.listing_id).filter(Boolean);

  const [{ data: profiles }, { data: listings }, { data: lastMessages }] = await Promise.all([
    admin.from("profiles").select("id, username, avatar_url").in("id", [...new Set(otherPartyIds)]),
    listingIds.length > 0
      ? admin.from("listings").select("id, title").in("id", listingIds)
      : Promise.resolve({ data: [] }),
    admin
      .from("messages")
      .select("conversation_id, body, created_at, sender_id, read_at")
      .in("conversation_id", conversations.map((c: any) => c.id))
      .order("created_at", { ascending: false })
      .limit(conversations.length * 2), // enough to get last per convo
  ]);

  const profileMap = new Map<string, any>();
  (profiles ?? []).forEach((p: any) => profileMap.set(p.id, p));

  const listingMap = new Map<string, any>();
  (listings ?? []).forEach((l: any) => listingMap.set(l.id, l));

  // Get the most recent message per conversation
  const lastMsgMap = new Map<string, any>();
  (lastMessages ?? []).forEach((m: any) => {
    if (!lastMsgMap.has(m.conversation_id)) {
      lastMsgMap.set(m.conversation_id, m);
    }
  });

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Messages
      </h1>

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {(conversations as any[]).map((convo) => {
          const otherPartyId = convo.buyer_id === user.id ? convo.seller_id : convo.buyer_id;
          const other = profileMap.get(otherPartyId);
          const listing = convo.listing_id ? listingMap.get(convo.listing_id) : null;
          const lastMsg = lastMsgMap.get(convo.id);
          const hasUnread = lastMsg && lastMsg.sender_id !== user.id && !lastMsg.read_at;

          return (
            <Link
              key={convo.id}
              href={`/messages/${convo.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white hover:bg-stone-50 transition-colors"
            >
              {/* Avatar */}
              <div className="h-10 w-10 rounded-full bg-muted flex-shrink-0 overflow-hidden">
                {other?.avatar_url ? (
                  <Image
                    src={other.avatar_url}
                    alt={other?.username ?? ""}
                    width={40}
                    height={40}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-olive/10">
                    <span className="text-sm font-bold text-olive">
                      {(other?.username ?? "?")[0].toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${hasUnread ? "text-navy font-semibold" : "text-navy"}`}>
                    @{other?.username ?? "user"}
                  </p>
                  {hasUnread && (
                    <span className="h-2 w-2 rounded-full bg-olive flex-shrink-0" />
                  )}
                </div>
                {listing && (
                  <p className="text-xs text-muted-foreground truncate">{listing.title}</p>
                )}
                {lastMsg && (
                  <p className={`text-xs truncate mt-0.5 ${hasUnread ? "text-navy" : "text-muted-foreground"}`}>
                    {lastMsg.sender_id === user.id ? "You: " : ""}{lastMsg.body}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {lastMsg && (
                  <span className="text-xs text-muted-foreground">
                    {new Date(lastMsg.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" })}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
