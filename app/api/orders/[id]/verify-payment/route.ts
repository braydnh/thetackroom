/**
 * POST /api/orders/[id]/verify-payment
 *
 * Fallback for when the Stripe webhook fails to deliver.
 * Called by the order page when the buyer lands on ?confirmed=true but the
 * order is still pending_payment after a few seconds.
 *
 * Checks the PaymentIntent directly with Stripe and — if succeeded —
 * fulfills the order exactly as the webhook would have.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { newOrderEmail, orderConfirmedBuyerEmail } from "@/lib/emails";
import { formatAUD } from "@/lib/utils/currency";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-01-28.clover" });

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Fetch the order — must belong to this buyer
  const { data: order } = await admin
    .from("orders")
    .select("id, status, stripe_payment_intent_id, seller_id, buyer_id, subtotal, shipping_amount, pickup_method, listing_id, listings(title)")
    .eq("id", orderId)
    .eq("buyer_id", user.id)
    .single();

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  // Already processed — just return current status
  if ((order as any).status !== "pending_payment") {
    return NextResponse.json({ status: (order as any).status });
  }

  const piId = (order as any).stripe_payment_intent_id;
  if (!piId) return NextResponse.json({ status: "pending_payment" });

  // Check with Stripe
  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(piId);
  } catch {
    return NextResponse.json({ status: "pending_payment" });
  }

  if (pi.status !== "succeeded") {
    return NextResponse.json({ status: "pending_payment" });
  }

  // Payment confirmed — fulfill the order (mirrors webhook logic)
  const newStatus = (order as any).pickup_method === "shipping" ? "awaiting_shipment" : "payment_captured";

  await admin
    .from("orders")
    .update({
      status: newStatus,
      stripe_charge_id: pi.latest_charge as string | null,
    })
    .eq("id", orderId);

  // Mark listing as reserved
  if ((order as any).listing_id) {
    await admin
      .from("listings")
      .update({ status: "reserved" })
      .eq("id", (order as any).listing_id);
  }

  // Send emails + notifications (best-effort)
  try {
    const listingTitle = ((order as any).listings as any)?.title ?? "Your item";
    const totalAmount = formatAUD(pi.amount_received);

    const [{ data: sellerProfile }, sellerAuth, { data: buyerProfile }] = await Promise.all([
      admin.from("profiles").select("username, display_name").eq("id", (order as any).seller_id).single(),
      admin.auth.admin.getUserById((order as any).seller_id),
      admin.from("profiles").select("username, display_name").eq("id", user.id).single(),
    ]);

    const sellerEmail = (sellerAuth as any).data?.user?.email;
    const sellerName = sellerProfile?.display_name ?? sellerProfile?.username ?? "there";
    const buyerName = buyerProfile?.display_name ?? buyerProfile?.username ?? "A buyer";

    if (sellerEmail) {
      await sendEmail({
        to: sellerEmail,
        subject: `You've made a sale — ${listingTitle}`,
        html: newOrderEmail({
          sellerName,
          buyerName,
          listingTitle,
          amount: formatAUD((order as any).subtotal),
          orderId,
        }),
      });
    }

    const buyerAuth = await admin.auth.admin.getUserById(user.id);
    const buyerEmail = (buyerAuth as any).data?.user?.email;
    if (buyerEmail) {
      await sendEmail({
        to: buyerEmail,
        subject: `Order confirmed — ${listingTitle}`,
        html: orderConfirmedBuyerEmail({
          buyerName,
          listingTitle,
          sellerName,
          amount: totalAmount,
          orderId,
          pickupMethod: (order as any).pickup_method as "shipping" | "local_pickup",
        }),
      });
    }

    await admin.from("notifications").insert([
      {
        user_id: (order as any).seller_id,
        type: "new_sale",
        title: "You've made a sale!",
        body: `${buyerName} purchased "${listingTitle}"`,
        link: `/orders/${orderId}`,
      },
      {
        user_id: user.id,
        type: "order_confirmed",
        title: "Order confirmed",
        body: `Your purchase of "${listingTitle}" is confirmed.`,
        link: `/orders/${orderId}`,
      },
    ]);
  } catch (err) {
    console.error("verify-payment: notifications/email failed:", err);
  }

  return NextResponse.json({ status: newStatus });
}
