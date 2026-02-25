import { Navbar } from "@/components/shared/Navbar";
import { Footer } from "@/components/shared/Footer";
import { createClient } from "@/lib/supabase/server";

export default async function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { username: string; avatar_url: string | null; role: string | null } | null = null;
  let unreadMessages = 0;

  if (user) {
    const [{ data: profileData }, { data: convos }] = await Promise.all([
      supabase.from("profiles").select("username, avatar_url, role").eq("id", user.id).single(),
      supabase.from("conversations").select("id").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    ]);

    profile = profileData;

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
      <Navbar user={profile} unreadMessages={unreadMessages} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
