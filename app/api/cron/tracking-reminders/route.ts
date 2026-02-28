/**
 * GET /api/cron/tracking-reminders
 *
 * Vercel Cron job — runs every 30 minutes (requires Vercel Pro).
 * Sends reminder emails to sellers who haven't submitted tracking yet:
 *   - 6-hour reminder: tracking_deadline is 5.5–6.5 hours away
 *   - 2-hour final warning: tracking_deadline is 1.5–2.5 hours away
 *
 * Requires two boolean columns on the orders table:
 *   ALTER TABLE orders
 *     ADD COLUMN IF NOT EXISTS reminder_6h_sent boolean NOT NULL DEFAULT false,
 *     ADD COLUMN IF NOT EXISTS reminder_2h_sent boolean NOT NULL DEFAULT false;
 *
 * Secured with CRON_SECRET — Vercel passes it as Authorization: Bearer <secret>
 */

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { trackingReminderEmail } from "@/lib/emails";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now = Date.now();
  const H = 60 * 60 * 1000; // 1 hour in ms

  // ±30-minute windows around each reminder target (cron runs every 30 min)
  const h6lo = new Date(now + 5.5 * H).toISOString();
  const h6hi = new Date(now + 6.5 * H).toISOString();
  const h2lo = new Date(now + 1.5 * H).toISOString();
  const h2hi = new Date(now + 2.5 * H).toISOString();

  const [{ data: sixHourOrders }, { data: twoHourOrders }] = await Promise.all([
    admin
      .from("orders")
      .select("id, seller_id, tracking_deadline, listings(title)")
      .eq("status", "awaiting_shipment")
      .eq("pickup_method", "shipping")
      .eq("reminder_6h_sent", false)
      .gte("tracking_deadline", h6lo)
      .lte("tracking_deadline", h6hi)
      .limit(50),
    admin
      .from("orders")
      .select("id, seller_id, tracking_deadline, listings(title)")
      .eq("status", "awaiting_shipment")
      .eq("pickup_method", "shipping")
      .eq("reminder_2h_sent", false)
      .gte("tracking_deadline", h2lo)
      .lte("tracking_deadline", h2hi)
      .limit(50),
  ]);

  const results: { order_id: string; reminder: "6h" | "2h"; status: "ok" | "error"; detail?: string }[] = [];

  async function sendReminder(order: any, hoursLeft: 6 | 2) {
    const flagField = hoursLeft === 6 ? "reminder_6h_sent" : "reminder_2h_sent";
    try {
      const [{ data: profile }, authResult] = await Promise.all([
        admin.from("profiles").select("display_name, username").eq("id", order.seller_id).single(),
        admin.auth.admin.getUserById(order.seller_id),
      ]);

      const sellerEmail = (authResult as any).data?.user?.email;
      if (!sellerEmail) throw new Error("No seller email");

      const sellerName = profile?.display_name ?? profile?.username ?? "there";
      const listingTitle = order.listings?.title ?? "your item";
      const deadline = new Date(order.tracking_deadline).toLocaleString("en-AU", {
        timeZone: "Australia/Sydney",
        dateStyle: "medium",
        timeStyle: "short",
      });

      await sendEmail({
        to: sellerEmail,
        subject:
          hoursLeft === 6
            ? `Reminder: add tracking for "${listingTitle}" — due in ~6 hours`
            : `⚠️ Final reminder: tracking due in ~2 hours — "${listingTitle}"`,
        html: trackingReminderEmail({ sellerName, listingTitle, orderId: order.id, hoursLeft, deadline }),
      });

      await admin.from("orders").update({ [flagField]: true }).eq("id", order.id);

      results.push({ order_id: order.id, reminder: hoursLeft === 6 ? "6h" : "2h", status: "ok" });
    } catch (err: any) {
      console.error(`Tracking reminder ${hoursLeft}h failed for order ${order.id}:`, err.message);
      results.push({ order_id: order.id, reminder: hoursLeft === 6 ? "6h" : "2h", status: "error", detail: err.message });
    }
  }

  await Promise.all([
    ...(sixHourOrders ?? []).map((o: any) => sendReminder(o, 6)),
    ...(twoHourOrders ?? []).map((o: any) => sendReminder(o, 2)),
  ]);

  return NextResponse.json({
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
