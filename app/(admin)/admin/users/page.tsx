import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import Image from "next/image";
import { Star } from "lucide-react";
import { SuspendUserButton } from "./SuspendUserButton";
import { DeleteUserButton } from "./DeleteUserButton";
import { SyncSellersButton } from "./SyncSellersButton";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { page = "1", q = "" } = await searchParams;
  const pageNum = Math.max(1, parseInt(page, 10));
  const pageSize = 30;
  const offset = (pageNum - 1) * pageSize;

  const admin = createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, username, display_name, avatar_url, role, is_founding_seller, total_sales, average_rating, is_suspended, stripe_onboarding_complete, created_at")
    .order("created_at", { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (q) {
    query = (query as any).ilike("username", `%${q}%`);
  }

  const { data: users } = await (query as any);

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold text-navy mb-6" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Users
      </h1>

      <SyncSellersButton />

      <div className="rounded-xl border border-border overflow-hidden divide-y divide-border">
        {(users ?? []).length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">No users found</div>
        ) : (
          (users as any[]).map((u) => (
            <div key={u.id} className="flex items-center gap-4 px-5 py-4 bg-white">
              <div className="h-10 w-10 rounded-full bg-muted overflow-hidden flex-shrink-0">
                {u.avatar_url ? (
                  <Image src={u.avatar_url} alt="" width={40} height={40} className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full flex items-center justify-center bg-olive/10">
                    <span className="text-sm font-bold text-olive">{u.username[0].toUpperCase()}</span>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Link href={`/profile/${u.username}`} target="_blank" className="text-sm font-medium text-navy hover:underline">
                    @{u.username}
                  </Link>
                  {u.role === "admin" && (
                    <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 text-[10px] font-medium">admin</span>
                  )}
                  {u.is_founding_seller && (
                    <span className="rounded-full bg-olive/10 text-olive px-2 py-0.5 text-[10px] font-medium flex items-center gap-0.5">
                      <Star className="h-2.5 w-2.5" /> Founding Seller
                    </span>
                  )}
                  {u.is_suspended && (
                    <span className="rounded-full bg-red-100 text-red-700 px-2 py-0.5 text-[10px] font-medium">suspended</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{u.total_sales} sales</span>
                  {Number(u.average_rating) > 0 && <span>⭐️ {Number(u.average_rating).toFixed(1)}</span>}
                  <span>{u.stripe_onboarding_complete ? "Seller" : "Buyer only"}</span>
                  <span>Joined {new Date(u.created_at).toLocaleDateString("en-AU")}</span>
                </div>
              </div>

              {u.role !== "admin" && (
                <div className="flex items-center gap-1">
                  <SuspendUserButton userId={u.id} isSuspended={u.is_suspended} />
                  <DeleteUserButton userId={u.id} username={u.username} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex justify-between mt-6">
        {pageNum > 1 && (
          <Link href={`/admin/users?page=${pageNum - 1}`} className="text-sm text-olive hover:underline">← Previous</Link>
        )}
        {(users ?? []).length === pageSize && (
          <Link href={`/admin/users?page=${pageNum + 1}`} className="text-sm text-olive hover:underline ml-auto">Next →</Link>
        )}
      </div>
    </div>
  );
}
