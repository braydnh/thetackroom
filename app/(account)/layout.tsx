import { Navbar } from "@/components/shared/Navbar";
import { createClient } from "@/lib/supabase/server";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: { username: string; avatar_url: string | null; role: string | null } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, role")
      .eq("id", user.id)
      .single();
    profile = data;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar user={profile} />
      <main className="flex-1 bg-background">{children}</main>
    </div>
  );
}
