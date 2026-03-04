/**
 * DELETE /api/admin/users/[id]/delete
 * Admin only — permanently deletes a user and their profile.
 * Deletes the profile row first (clears mobile_number and all profile data),
 * then deletes the auth user so no orphaned data remains.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!callerProfile || (callerProfile as any).role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Prevent deleting another admin
  const admin = createAdminClient();
  const { data: targetProfile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", id)
    .single();

  if (targetProfile?.role === "admin") {
    return NextResponse.json({ error: "Cannot delete an admin account" }, { status: 400 });
  }

  // Block deletion if user has non-pending orders (would lose transaction history)
  const { data: activeOrders } = await admin
    .from("orders")
    .select("id")
    .or(`buyer_id.eq.${id},seller_id.eq.${id}`)
    .not("status", "eq", "pending_payment");

  if (activeOrders && activeOrders.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete: user has orders. Suspend the account instead." },
      { status: 400 }
    );
  }

  // Delete any abandoned pending_payment orders (no transaction took place)
  await admin
    .from("orders")
    .delete()
    .or(`buyer_id.eq.${id},seller_id.eq.${id}`)
    .eq("status", "pending_payment");

  // Delete profile first — clears mobile_number and all profile data
  const { error: profileError } = await admin
    .from("profiles")
    .delete()
    .eq("id", id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Delete auth user
  const { error: authError } = await admin.auth.admin.deleteUser(id);
  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
