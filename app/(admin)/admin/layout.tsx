import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/shared/Navbar";
import { LayoutDashboard, Package, Users, ShoppingCart, Settings, Star, Tag } from "lucide-react";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/listings", label: "Listings", icon: Package },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/founding-sellers", label: "Founding Sellers", icon: Star },
  { href: "/admin/ambassadors", label: "Ambassadors", icon: Star },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/config", label: "Config", icon: Settings },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: convos }, { count: notifCount }] = await Promise.all([
    supabase.from("profiles").select("username, avatar_url, role").eq("id", user.id).single(),
    supabase.from("conversations").select("id").or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
    supabase.from("notifications").select("*", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
  ]);

  if (!profile || (profile as any).role !== "admin") redirect("/");

  let unreadMessages = 0;
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

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={profile} unreadMessages={unreadMessages} unreadNotifications={notifCount ?? 0} />
      <div className="flex flex-1 min-w-0">
        {/* Sidebar — desktop only */}
        <aside className="w-56 flex-shrink-0 border-r border-border bg-white hidden md:block">
          <nav className="p-4 space-y-1 sticky top-16">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-navy hover:bg-muted transition-colors"
              >
                <Icon className="h-4 w-4 text-olive" />
                {label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* Right column: mobile nav on top, content below */}
        <div className="flex flex-col flex-1 min-w-0">
          {/* Mobile nav */}
          <div className="md:hidden sticky top-16 z-10 border-b border-border bg-white flex overflow-x-auto gap-1 px-4 py-2">
            {NAV.map(({ href, label }) => (
              <Link
                key={href}
                href={href}
                className="flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium text-navy hover:bg-muted whitespace-nowrap"
              >
                {label}
              </Link>
            ))}
          </div>

          <main className="flex-1 bg-background min-w-0">{children}</main>
        </div>
      </div>
    </div>
  );
}
