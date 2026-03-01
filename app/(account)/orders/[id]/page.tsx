"use client";

import { useState, useEffect } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAUD } from "@/lib/utils/currency";
import {
  ChevronLeft,
  CheckCircle2,
  Loader2,
  Package,
  Truck,
  MapPin,
  Clock,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface OrderDetail {
  id: string;
  status: string;
  subtotal: number;
  shipping_amount: number;
  platform_commission_pct: number;
  pickup_method: "shipping" | "local_pickup";
  tracking_number: string | null;
  shipping_carrier: string | null;
  tracking_deadline: string | null;
  dispute_window_ends_at: string | null;
  created_at: string;
  is_seller: boolean;
  listing: {
    id: string;
    title: string;
    primary_image: string | null;
    condition: string;
    brand: string | null;
  };
  other_party_username: string;
}

const STATUS_STEPS_SHIPPING = [
  { key: "payment_captured",  label: "Payment received" },
  { key: "awaiting_shipment", label: "Awaiting shipment" },
  { key: "shipped",           label: "Shipped" },
  { key: "delivered",         label: "Delivered" },
  { key: "completed",         label: "Completed" },
];

const STATUS_STEPS_PICKUP = [
  { key: "payment_captured", label: "Payment received" },
  { key: "completed",        label: "Picked up & completed" },
];

const TERMINAL_STATUSES = new Set(["completed", "disputed", "refunded", "cancelled"]);

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    pending_payment:   { label: "Pending payment",   color: "bg-muted text-muted-foreground" },
    payment_captured:  { label: "Paid",              color: "bg-amber-100 text-amber-700" },
    awaiting_shipment: { label: "Awaiting shipment", color: "bg-amber-100 text-amber-700" },
    shipped:           { label: "Shipped",           color: "bg-sky-100 text-sky-700" },
    delivered:         { label: "Delivered",         color: "bg-emerald-100 text-emerald-700" },
    dispute_window:    { label: "Dispute window",    color: "bg-emerald-100 text-emerald-700" },
    completed:         { label: "Completed",         color: "bg-emerald-100 text-emerald-700" },
    disputed:          { label: "Disputed",          color: "bg-red-100 text-red-700" },
    refunded:          { label: "Refunded",          color: "bg-muted text-muted-foreground" },
    cancelled:         { label: "Cancelled",         color: "bg-muted text-muted-foreground" },
  };
  const { label, color } = map[status] ?? { label: status, color: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", color)}>{label}</span>
  );
}

function ProgressStepper({ steps, currentStatus }: { steps: { key: string; label: string }[]; currentStatus: string }) {
  const idx = steps.findIndex((s) => s.key === currentStatus);
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => {
        const done = idx >= i;
        const current = idx === i;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  done
                    ? "bg-olive border-olive text-cream"
                    : "bg-white border-border text-muted-foreground"
                )}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <p className={cn("text-[10px] mt-1 text-center max-w-[60px]", current ? "text-olive font-medium" : "text-muted-foreground")}>
                {step.label}
              </p>
            </div>
            {i < steps.length - 1 && (
              <div className={cn("flex-1 h-0.5 mx-1 mb-4", done && idx > i ? "bg-olive" : "bg-border")} />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const confirmed = searchParams.get("confirmed") === "true";

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [trackingNumber, setTrackingNumber] = useState("");
  const [carrier, setCarrier] = useState("auspost");
  const [submittingTracking, setSubmittingTracking] = useState(false);
  const [confirmingPickup, setConfirmingPickup] = useState(false);
  const [rating, setRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setLoading(false); return; }
        setOrder(data);
        if (data.tracking_number) setTrackingNumber(data.tracking_number);
        if (data.shipping_carrier) setCarrier(data.shipping_carrier);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // When arriving from a successful payment, poll until webhook updates the status.
  // After 5s if still pending, call verify-payment as a webhook fallback.
  useEffect(() => {
    if (!confirmed) return;
    let attempts = 0;
    let fallbackCalled = false;

    const interval = setInterval(async () => {
      attempts++;
      if (attempts > 10) { clearInterval(interval); return; } // give up after 30s

      // After 5s (attempt 2+) call the Stripe verify fallback if still pending
      if (attempts === 2 && !fallbackCalled) {
        fallbackCalled = true;
        try {
          await fetch(`/api/orders/${id}/verify-payment`, { method: "POST" });
        } catch {}
      }

      fetch(`/api/orders/${id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.status && data.status !== "pending_payment") {
            setOrder(data);
            clearInterval(interval);
          }
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(interval);
  }, [confirmed, id]);

  async function handleConfirmPickup() {
    setConfirmingPickup(true);
    const res = await fetch(`/api/orders/${id}/confirm-pickup`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to confirm pickup");
    } else {
      toast.success("Order marked as picked up! Your payout is on its way.");
      setOrder((prev) => prev ? { ...prev, status: "completed" } : prev);
    }
    setConfirmingPickup(false);
  }

  async function handleSubmitTracking(e: React.FormEvent) {
    e.preventDefault();
    if (!trackingNumber.trim()) return;
    setSubmittingTracking(true);
    const res = await fetch(`/api/orders/${id}/tracking`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tracking_number: trackingNumber.trim(), carrier }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to submit tracking");
    } else {
      toast.success("Tracking submitted!");
      setOrder((prev) => prev ? { ...prev, status: "shipped", tracking_number: trackingNumber.trim(), shipping_carrier: carrier } : prev);
    }
    setSubmittingTracking(false);
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1) return;
    setSubmittingReview(true);
    const res = await fetch(`/api/orders/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating, comment: reviewComment }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to submit review");
    } else {
      toast.success("Review submitted. Thanks!");
      setReviewSubmitted(true);
    }
    setSubmittingReview(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">Order not found.</p>
        <Button asChild variant="outline"><Link href="/orders">My Orders</Link></Button>
      </div>
    );
  }

  const total = order.subtotal + order.shipping_amount;
  const steps = order.pickup_method === "local_pickup" ? STATUS_STEPS_PICKUP : STATUS_STEPS_SHIPPING;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> My Orders
      </Link>

      {/* Confirmation banner */}
      {confirmed && (
        <div className="mb-6 rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-900">Payment confirmed!</p>
            <p className="text-sm text-emerald-700 mt-0.5">
              {order.pickup_method === "local_pickup"
                ? "Arrange pickup with the seller. Payment will be released when picked up."
                : "The seller has been notified and will ship your item shortly."}
            </p>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1
            className="text-2xl font-bold text-navy"
            style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
          >
            Order
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-mono">{order.id}</p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {/* Progress tracker */}
      {!TERMINAL_STATUSES.has(order.status) && order.status !== "pending_payment" && (
        <div className="rounded-xl border border-border p-5 mb-6">
          <ProgressStepper steps={steps} currentStatus={order.status} />
        </div>
      )}

      {/* Listing card */}
      <div className="rounded-xl border border-border p-4 mb-6 flex gap-4">
        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {order.listing.primary_image ? (
            <Image src={order.listing.primary_image} alt={order.listing.title} width={64} height={64} className="object-cover h-full w-full" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-2xl opacity-20">🐴</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/listings/${order.listing.id}`} className="font-medium text-navy text-sm hover:underline line-clamp-2">
            {order.listing.title}
          </Link>
          <p className="text-xs text-muted-foreground mt-0.5">{order.listing.brand ?? order.listing.condition}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {order.is_seller ? `Buyer: @${order.other_party_username}` : `Seller: @${order.other_party_username}`}
          </p>
        </div>
      </div>

      {/* Delivery method */}
      <div className="rounded-xl border border-border p-4 mb-6 flex items-center gap-3">
        {order.pickup_method === "local_pickup" ? (
          <MapPin className="h-4 w-4 text-olive flex-shrink-0" />
        ) : (
          <Truck className="h-4 w-4 text-olive flex-shrink-0" />
        )}
        <div className="flex-1">
          <p className="text-sm font-medium text-navy">
            {order.pickup_method === "local_pickup" ? "Local pickup" : "Shipping"}
          </p>
          {order.tracking_number && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {order.shipping_carrier?.toUpperCase()} — <span className="font-mono">{order.tracking_number}</span>
            </p>
          )}
        </div>
        {order.tracking_deadline && order.status === "awaiting_shipment" && (
          <div className="flex items-center gap-1 text-xs text-amber-600">
            <Clock className="h-3 w-3" />
            Ship by {new Date(order.tracking_deadline).toLocaleDateString("en-AU")}
          </div>
        )}
      </div>

      {/* Price breakdown */}
      <div className="rounded-xl bg-stone-50 border border-border p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Item price</span>
          <span>{formatAUD(order.subtotal)}</span>
        </div>
        {order.shipping_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{formatAUD(order.shipping_amount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-navy">
          <span>Total</span>
          <span>{formatAUD(total)}</span>
        </div>
        {order.is_seller && (
          <p className="text-xs text-muted-foreground pt-1">
            Platform commission: {order.platform_commission_pct}% — your payout is released after delivery confirmation.
          </p>
        )}
      </div>

      {/* Seller: tracking submission */}
      {order.is_seller && order.status === "awaiting_shipment" && order.pickup_method === "shipping" && (
        <div className="rounded-xl border border-border p-5 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="h-4 w-4 text-olive" />
            <p className="font-semibold text-navy text-sm">Submit tracking</p>
          </div>
          <form onSubmit={handleSubmitTracking} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-navy mb-1">Carrier</label>
              <select
                value={carrier}
                onChange={(e) => setCarrier(e.target.value)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy focus:outline-none focus:ring-2 focus:ring-olive/40"
              >
                <option value="auspost">Australia Post</option>
                <option value="startrack">StarTrack</option>
                <option value="sendle">Sendle</option>
                <option value="courier_please">Courier Please</option>
                <option value="dhl">DHL</option>
                <option value="tnt">TNT</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-navy mb-1">Tracking number</label>
              <input
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                placeholder="e.g. 7J12345678"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40"
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-olive hover:bg-olive-light text-cream"
              disabled={submittingTracking || !trackingNumber.trim()}
            >
              {submittingTracking ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
              ) : (
                "Submit tracking"
              )}
            </Button>
          </form>
        </div>
      )}

      {/* Seller: local pickup — mark as picked up */}
      {order.is_seller && order.status === "payment_captured" && order.pickup_method === "local_pickup" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Awaiting local pickup</p>
              <p className="text-xs text-amber-700 mt-1">
                Arrange pickup with the buyer. Once picked up, mark the order complete to receive your payout.
              </p>
            </div>
          </div>
          <Button
            className="w-full bg-olive hover:bg-olive-light text-cream"
            onClick={handleConfirmPickup}
            disabled={confirmingPickup}
          >
            {confirmingPickup
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
              : "Mark as picked up & release payout"
            }
          </Button>
        </div>
      )}

      {/* Dispute window info */}
      {order.status === "dispute_window" && order.dispute_window_ends_at && (
        <div className="rounded-xl border border-border p-4 flex items-start gap-3 mb-6">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-navy">Buyer dispute window</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Payout releases automatically on {new Date(order.dispute_window_ends_at).toLocaleString("en-AU")}.
            </p>
          </div>
        </div>
      )}

      {/* Completed */}
      {order.status === "completed" && (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-emerald-800">
              {order.is_seller
                ? "Your payout has been released. Enjoy your sale!"
                : "Order complete. We hope you love your new gear!"}
            </p>
          </div>

          {/* Review form — buyers only, one time */}
          {!order.is_seller && !reviewSubmitted && (
            <div className="rounded-xl border border-border p-5">
              <p className="font-semibold text-navy text-sm mb-4">Leave a review for @{order.other_party_username}</p>
              <form onSubmit={handleSubmitReview} className="space-y-4">
                {/* Star rating */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`text-2xl transition-colors ${star <= rating ? "text-amber-400" : "text-muted-foreground/30"}`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {rating > 0 ? ["", "Poor", "Fair", "Good", "Great", "Excellent"][rating] : "Select rating"}
                  </span>
                </div>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Share your experience (optional)"
                  rows={3}
                  maxLength={500}
                  className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-navy placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-olive/40 resize-none"
                />
                <Button
                  type="submit"
                  className="w-full bg-olive hover:bg-olive-light text-cream"
                  disabled={rating < 1 || submittingReview}
                >
                  {submittingReview
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…</>
                    : "Submit Review"
                  }
                </Button>
              </form>
            </div>
          )}

          {reviewSubmitted && !order.is_seller && (
            <div className="rounded-xl bg-olive/5 border border-olive/20 p-4 text-center">
              <p className="text-sm text-olive font-medium">Review submitted ★</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
