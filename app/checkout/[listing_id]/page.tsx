"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAUD } from "@/lib/utils/currency";
import { ShieldCheck, Truck, MapPin, Loader2, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface ListingData {
  id: string;
  title: string;
  price: number;
  shipping_price: number;
  allows_shipping: boolean;
  allows_pickup: boolean;
  condition: string;
  brand: string | null;
  primary_image: string | null;
  seller_username: string;
  seller_location: string | null;
}

export default function CheckoutPage() {
  const { listing_id } = useParams<{ listing_id: string }>();
  const [listing, setListing] = useState<ListingData | null>(null);
  const [pickupMethod, setPickupMethod] = useState<"shipping" | "local_pickup">("shipping");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [creatingIntent, setCreatingIntent] = useState(false);

  // Load listing details
  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/listings/${listing_id}`);
      if (!res.ok) { setLoadingListing(false); return; }
      const data = await res.json();
      setListing(data);
      setPickupMethod(data.allows_shipping ? "shipping" : "local_pickup");
      setLoadingListing(false);
    }
    load();
  }, [listing_id]);

  const createIntent = useCallback(async (method: "shipping" | "local_pickup") => {
    setCreatingIntent(true);
    const res = await fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_id, pickup_method: method }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error ?? "Failed to start checkout");
      setCreatingIntent(false);
      return;
    }
    setClientSecret(data.client_secret);
    setOrderId(data.order_id);
    setCreatingIntent(false);
  }, [listing_id]);

  function handleMethodChange(method: "shipping" | "local_pickup") {
    setPickupMethod(method);
    setClientSecret(null);
    setOrderId(null);
  }

  if (loadingListing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">This listing is no longer available.</p>
        <Button asChild variant="outline"><Link href="/listings">Browse listings</Link></Button>
      </div>
    );
  }

  const shippingAmount = pickupMethod === "shipping" ? listing.shipping_price : 0;
  const total = listing.price + shippingAmount;

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <Link
        href={`/listings/${listing_id}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Back to listing
      </Link>

      <h1
        className="text-2xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Checkout
      </h1>

      {/* Order summary */}
      <div className="rounded-xl border border-border p-4 mb-6 flex gap-4">
        <div className="h-16 w-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
          {listing.primary_image ? (
            <Image src={listing.primary_image} alt={listing.title} width={64} height={64} className="object-cover h-full w-full" />
          ) : (
            <div className="h-full w-full flex items-center justify-center">
              <span className="text-2xl opacity-20">🐴</span>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-navy text-sm truncate">{listing.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {listing.brand ?? listing.condition}
          </p>
          <p className="text-base font-bold text-navy mt-1">{formatAUD(listing.price)}</p>
        </div>
      </div>

      {/* Delivery method */}
      {listing.allows_shipping && listing.allows_pickup && (
        <div className="mb-6 space-y-2">
          <p className="text-sm font-medium text-navy">Delivery method</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleMethodChange("shipping")}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-colors",
                pickupMethod === "shipping" ? "border-olive bg-olive/5" : "border-border"
              )}
            >
              <Truck className={cn("h-4 w-4 mb-2", pickupMethod === "shipping" ? "text-olive" : "text-muted-foreground")} />
              <p className="text-sm font-medium text-navy">Shipping</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {listing.shipping_price === 0 ? "Free" : formatAUD(listing.shipping_price)}
              </p>
            </button>
            <button
              type="button"
              onClick={() => handleMethodChange("local_pickup")}
              className={cn(
                "rounded-xl border-2 p-4 text-left transition-colors",
                pickupMethod === "local_pickup" ? "border-olive bg-olive/5" : "border-border"
              )}
            >
              <MapPin className={cn("h-4 w-4 mb-2", pickupMethod === "local_pickup" ? "text-olive" : "text-muted-foreground")} />
              <p className="text-sm font-medium text-navy">Local pickup</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {listing.seller_location ?? "Arrange with seller"}
              </p>
            </button>
          </div>
        </div>
      )}

      {/* Price breakdown */}
      <div className="rounded-xl bg-stone-50 border border-border p-4 mb-6 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Item price</span>
          <span>{formatAUD(listing.price)}</span>
        </div>
        {pickupMethod === "shipping" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{listing.shipping_price === 0 ? "Free" : formatAUD(listing.shipping_price)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-navy">
          <span>Total</span>
          <span>{formatAUD(total)}</span>
        </div>
      </div>

      {/* Buyer protection */}
      <div className="rounded-xl bg-olive/5 border border-olive/20 p-4 flex items-start gap-3 mb-6">
        <ShieldCheck className="h-4 w-4 text-olive mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-navy">Buyer Protection: </strong>
          Payment is held securely by Stripe and only released to the seller after your item is delivered.
        </p>
      </div>

      {/* Payment */}
      {!clientSecret ? (
        <Button
          className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
          onClick={() => createIntent(pickupMethod)}
          disabled={creatingIntent}
        >
          {creatingIntent ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparing payment…</>
          ) : (
            `Pay ${formatAUD(total)}`
          )}
        </Button>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <PaymentForm orderId={orderId!} total={total} />
        </Elements>
      )}
    </div>
  );
}

function PaymentForm({ orderId, total }: { orderId: string; total: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [paying, setPaying] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders/${orderId}?confirmed=true`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Payment failed. Please try again.");
      setPaying(false);
    } else if (paymentIntent?.status === "succeeded") {
      // Payment confirmed without redirect (e.g. saved card, no 3DS)
      router.push(`/orders/${orderId}?confirmed=true`);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-border p-4">
        <PaymentElement />
      </div>
      <Button
        type="submit"
        className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
        disabled={paying || !stripe}
      >
        {paying ? (
          <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing…</>
        ) : (
          `Pay ${formatAUD(total)}`
        )}
      </Button>
    </form>
  );
}
