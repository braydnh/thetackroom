"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatAUD } from "@/lib/utils/currency";
import { ShieldCheck, Truck, MapPin, Loader2, ChevronLeft, Tag, CheckCircle2 } from "lucide-react";
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

interface ShippingAddress {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postcode: string;
}

const EMPTY_ADDRESS: ShippingAddress = { name: "", line1: "", line2: "", city: "", state: "", postcode: "" };

export default function CheckoutPage() {
  const { listing_id } = useParams<{ listing_id: string }>();
  const [listing, setListing] = useState<ListingData | null>(null);
  const [pickupMethod, setPickupMethod] = useState<"shipping" | "local_pickup">("shipping");
  const [address, setAddress] = useState<ShippingAddress>(EMPTY_ADDRESS);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [loadingListing, setLoadingListing] = useState(true);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState<{ code: string; discountAmount: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [offerId, setOfferId] = useState<string | null>(null);
  const [offerPrice, setOfferPrice] = useState<number | null>(null);

  // Load listing details + read accepted offer from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const offer = params.get("offer");
    if (offer) setOfferId(offer);

    async function load() {
      const [listingRes, offerRes] = await Promise.all([
        fetch(`/api/listings/${listing_id}`),
        offer ? fetch(`/api/listing-offers/${offer}`) : Promise.resolve(null),
      ]);

      if (!listingRes.ok) { setLoadingListing(false); return; }
      const data = await listingRes.json();
      setListing(data);
      setPickupMethod(data.allows_shipping ? "shipping" : "local_pickup");

      if (offerRes?.ok) {
        const offerData = await offerRes.json().catch(() => ({}));
        const o = offerData.offer;
        if (o && (o.status === "accepted" || o.status === "counter_accepted") && o.accepted_price) {
          setOfferPrice(o.accepted_price);
        }
      }

      setLoadingListing(false);
    }
    load();
  }, [listing_id]);

  const applyCoupon = useCallback(async () => {
    if (!couponInput.trim() || !listing) return;
    setCouponLoading(true);
    setCouponError(null);
    const res = await fetch(`/api/coupons/validate?code=${encodeURIComponent(couponInput.trim())}&subtotal=${listing.price}`);
    const data = await res.json();
    setCouponLoading(false);
    if (data.valid) {
      setCouponApplied({ code: data.code, discountAmount: data.discount_amount });
      setCouponInput("");
    } else {
      setCouponError(data.error ?? "Invalid coupon code");
    }
  }, [couponInput, listing]);

  const removeCoupon = () => {
    setCouponApplied(null);
    setCouponError(null);
  };

  const addressValid = pickupMethod === "local_pickup" || (
    address.name.trim() !== "" &&
    address.line1.trim() !== "" &&
    address.city.trim() !== "" &&
    address.state.trim() !== "" &&
    address.postcode.trim() !== ""
  );

  const setAddr = (key: keyof ShippingAddress, value: string) =>
    setAddress((a) => ({ ...a, [key]: value }));

  const createIntent = useCallback(async (method: "shipping" | "local_pickup") => {
    setCreatingIntent(true);
    const res = await fetch("/api/stripe/create-payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id,
        pickup_method: method,
        shipping_address: method === "shipping" ? address : undefined,
        coupon_code: couponApplied?.code ?? undefined,
        offer_id: offerId ?? undefined,
      }),
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
  }, [listing_id, address, pickupMethod]);

  function handleMethodChange(method: "shipping" | "local_pickup") {
    setPickupMethod(method);
    setClientSecret(null);
    setOrderId(null);
    setAddress(EMPTY_ADDRESS);
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

  const itemPrice = offerPrice ?? listing.price;
  const shippingAmount = pickupMethod === "shipping" ? listing.shipping_price : 0;
  const discount = couponApplied?.discountAmount ?? 0;
  const total = Math.max(itemPrice + shippingAmount - discount, 0);

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
          {offerPrice ? (
            <div className="flex items-center gap-2 mt-1">
              <p className="text-base font-bold text-olive">{formatAUD(offerPrice)}</p>
              <p className="text-sm text-muted-foreground line-through">{formatAUD(listing.price)}</p>
              <span className="text-xs bg-olive/10 text-olive font-medium px-1.5 py-0.5 rounded-full">Offer price</span>
            </div>
          ) : (
            <p className="text-base font-bold text-navy mt-1">{formatAUD(listing.price)}</p>
          )}
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
          <span className="text-muted-foreground">Item price{offerPrice ? " (offer)" : ""}</span>
          <span className={offerPrice ? "text-olive font-semibold" : ""}>{formatAUD(itemPrice)}</span>
        </div>
        {pickupMethod === "shipping" && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Shipping</span>
            <span>{listing.shipping_price === 0 ? "Free" : formatAUD(listing.shipping_price)}</span>
          </div>
        )}
        {couponApplied && (
          <div className="flex justify-between text-sm text-emerald-700">
            <span className="flex items-center gap-1">
              <Tag className="h-3 w-3" />
              Coupon ({couponApplied.code})
            </span>
            <span>−{formatAUD(couponApplied.discountAmount)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-navy">
          <span>Total</span>
          <span>{formatAUD(total)}</span>
        </div>
      </div>

      {/* Shipping address — only for shipping orders */}
      {pickupMethod === "shipping" && (
        <div className="mb-6">
          <p className="text-sm font-medium text-navy mb-3">Shipping address</p>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Full name *"
              value={address.name}
              onChange={(e) => setAddr("name", e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
            <input
              type="text"
              placeholder="Address line 1 *"
              value={address.line1}
              onChange={(e) => setAddr("line1", e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
            <input
              type="text"
              placeholder="Address line 2 (optional)"
              value={address.line2}
              onChange={(e) => setAddr("line2", e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="City / Suburb *"
                value={address.city}
                onChange={(e) => setAddr("city", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              />
              <input
                type="text"
                placeholder="State *"
                value={address.state}
                onChange={(e) => setAddr("state", e.target.value)}
                className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
              />
            </div>
            <input
              type="text"
              placeholder="Postcode *"
              value={address.postcode}
              onChange={(e) => setAddr("postcode", e.target.value)}
              className="w-full rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40"
            />
          </div>
        </div>
      )}

      {/* Buyer protection */}
      <div className="rounded-xl bg-olive/5 border border-olive/20 p-4 flex items-start gap-3 mb-6">
        <ShieldCheck className="h-4 w-4 text-olive mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          <strong className="text-navy">Buyer Protection: </strong>
          Payment is held securely by Stripe and only released to the seller after your item is delivered.
        </p>
      </div>

      {/* Coupon code */}
      {!clientSecret && (
        <div className="mb-6">
          {couponApplied ? (
            <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="flex items-center gap-2 text-sm text-emerald-700">
                <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                <span><strong>{couponApplied.code}</strong> — {formatAUD(couponApplied.discountAmount)} off applied</span>
              </div>
              <button
                type="button"
                onClick={removeCoupon}
                className="text-xs text-muted-foreground hover:text-navy transition-colors ml-3"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Coupon code"
                  value={couponInput}
                  onChange={(e) => { setCouponInput(e.target.value); setCouponError(null); }}
                  onKeyDown={(e) => e.key === "Enter" && applyCoupon()}
                  className="flex-1 rounded-lg border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-olive/40 uppercase placeholder:normal-case"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={couponLoading || !couponInput.trim()}
                  className="shrink-0"
                >
                  {couponLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
                </Button>
              </div>
              {couponError && (
                <p className="text-xs text-destructive">{couponError}</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Payment */}
      {!clientSecret ? (
        <Button
          className="w-full bg-olive hover:bg-olive-light text-cream h-12 text-base"
          onClick={() => createIntent(pickupMethod)}
          disabled={creatingIntent || !addressValid}
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
