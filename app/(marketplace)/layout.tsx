import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { ReportButton } from "@/components/shared/ReportButton";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { username: string; avatar_url: string | null; role: string | null } | null = null;
  let unreadMessages = 0;
  let unreadNotifications = 0;

  if (user) {
    const [{ data: profileData }, { data: convos }, { count: notifCount }] = await Promise.all([
      supabase.from("profiles").select("username, avatar_url, role").eq("id", user.id).single(),
      supabase.from("conversations").select("id").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
      supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    ]);

    profile = profileData;
    unreadNotifications = notifCount ?? 0;

    const convoIds = (convos ?? []).map((c: any) => c.id);
    if (convoIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convoIds)
        .neq("sender_id", user.id)
        .is("read_at", null);
      unreadMessages = count ?? 0;
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={profile} unreadMessages={unreadMessages} unreadNotifications={unreadNotifications} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ReportButton />
    </div>
  );
}
