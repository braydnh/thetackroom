"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ImageUpload, type UploadedImage } from "@/components/listings/ImageUpload";
import { formatAUD, calculateSellerPayout } from "@/lib/utils/currency";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Info } from "lucide-react";
import { CATEGORIES, getCategoryLabel, getSubcategoryLabel } from "@/lib/categories";

const CONDITIONS = [
  { value: "new_with_tags", label: "New with tags", desc: "Unused, tags still attached" },
  { value: "like_new", label: "Like new", desc: "Used once or twice, no signs of wear" },
  { value: "good", label: "Good", desc: "Minor signs of wear, fully functional" },
  { value: "fair", label: "Fair", desc: "Visible wear, still functions well" },
  { value: "worn", label: "Well loved", desc: "Heavy use, clearly visible wear" },
];

interface FormState {
  title: string;
  description: string;
  price: string;
  category: string;
  subcategory: string;
  condition: string;
  brand: string;
  size: string;
  allowsShipping: boolean;
  shippingPrice: string;
  shippingNotes: string;
  allowsPickup: boolean;
}

const INITIAL: FormState = {
  title: "",
  description: "",
  price: "",
  category: "",
  subcategory: "",
  condition: "",
  brand: "",
  size: "",
  allowsShipping: true,
  shippingPrice: "",
  shippingNotes: "",
  allowsPickup: false,
};

export default function NewListingForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<"details" | "delivery" | "review">("details");

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const priceCents = Math.round(parseFloat(form.price || "0") * 100);
  const shippingCents = form.allowsShipping ? Math.round(parseFloat(form.shippingPrice || "0") * 100) : 0;
  const { commission, sellerPayout } = calculateSellerPayout(priceCents, shippingCents, 5);

  const canProceedToDelivery =
    images.length > 0 &&
    form.title.trim().length >= 3 &&
    form.description.trim().length >= 20 &&
    priceCents > 0 &&
    form.category &&
    form.condition;

  const shippingPriceValid = !form.allowsShipping || form.shippingPrice.trim() !== "";
  const canProceedToReview = (form.allowsShipping || form.allowsPickup) && shippingPriceValid;

  async function handlePublish() {
    if (!canProceedToDelivery || !canProceedToReview) return;
    setSaving(true);

    try {
      const supabase = createClient();

      // Verify the user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be signed in to list an item.");
        router.push("/login");
        return;
      }

      // 1. Create the listing (status: draft initially)
      const { data: listing, error: listingError } = await supabase
        .from("listings")
        .insert({
          seller_id: user.id,
          title: form.title.trim(),
          description: form.description.trim(),
          price: priceCents,
          condition: form.condition as any,
          category: form.category as any,
          subcategory: form.subcategory || null,
          brand: form.brand.trim() || null,
          size: form.size.trim() || null,
          status: "draft",
          allows_shipping: form.allowsShipping,
          shipping_price: form.allowsShipping ? shippingCents : 0,
          shipping_notes: form.shippingNotes.trim() || null,
          allows_pickup: form.allowsPickup,
        })
        .select("id")
        .single();

      if (listingError || !listing) {
        throw new Error(listingError?.message ?? "Failed to create listing");
      }

      // 2. Upload images to Supabase Storage
      const imageRows: { listing_id: string; storage_path: string; display_url: string; sort_order: number; is_primary: boolean }[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];

        if (img.url) {
          // Already-uploaded image (editing flow) — just reference it
          imageRows.push({
            listing_id: listing.id,
            storage_path: img.url,
            display_url: img.url,
            sort_order: i,
            is_primary: i === 0,
          });
          continue;
        }

        if (!img.file) continue;

        const ext = img.file.name.split(".").pop() ?? "jpg";
        const path = `${user.id}/${listing.id}/${i}-${Date.now()}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from("listing-images")
          .upload(path, img.file, { contentType: img.file.type, upsert: false });

        if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);

        const { data: { publicUrl } } = supabase.storage
          .from("listing-images")
          .getPublicUrl(path);

        imageRows.push({
          listing_id: listing.id,
          storage_path: path,
          display_url: publicUrl,
          sort_order: i,
          is_primary: i === 0,
        });
      }

      // 3. Insert image rows
      if (imageRows.length > 0) {
        const { error: imgError } = await supabase
          .from("listing_images")
          .insert(imageRows);
        if (imgError) throw new Error(imgError.message);
      }

      // 4. Activate the listing
      const { error: activateError } = await supabase
        .from("listings")
        .update({ status: "active" })
        .eq("id", listing.id);
      if (activateError) throw new Error(activateError.message);

      toast.success("Listing published!");
      router.push(`/selling/boost/${listing.id}?new=true`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to publish. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1
          className="text-2xl font-bold text-navy"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          List an Item
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Fill in the details below to get your item in front of equestrians across Australia.
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {[
          { key: "details", label: "Details" },
          { key: "delivery", label: "Delivery" },
          { key: "review", label: "Review" },
        ].map((s, i, arr) => (
          <div key={s.key} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === s.key
                  ? "bg-olive text-cream"
                  : ["details", "delivery", "review"].indexOf(step) > i
                  ? "bg-olive/30 text-olive"
                  : "bg-muted text-muted-foreground"
              }`}>
                {i + 1}
              </div>
              <span className={`text-sm font-medium hidden sm:block ${step === s.key ? "text-navy" : "text-muted-foreground"}`}>
                {s.label}
              </span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-px transition-colors ${
                ["details", "delivery", "review"].indexOf(step) > i ? "bg-olive/40" : "bg-border"
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Details ── */}
      {step === "details" && (
        <div className="space-y-6">
          {/* Photos */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-navy">
              Photos <span className="text-destructive">*</span>
            </Label>
            <p className="text-xs text-muted-foreground">
              Add up to 8 photos. The first photo is your cover image.
            </p>
            <ImageUpload images={images} onChange={setImages} />
          </div>

          <Separator />

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="title">
              Title <span className="text-destructive">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g. Bates Caprilli Close Contact Saddle 17.5 inch"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{form.title.length}/100</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">
              Description <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your item: measurements, history, any flaws, why you're selling..."
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={5}
              maxLength={2000}
              className="resize-none"
            />
            <div className="flex justify-between">
              {form.description.trim().length < 20 && form.description.length > 0 && (
                <p className="text-xs text-destructive">{20 - form.description.trim().length} more characters needed</p>
              )}
              <p className="text-xs text-muted-foreground ml-auto">{form.description.length}/2000</p>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label htmlFor="price">
              Price (AUD) <span className="text-destructive">*</span>
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                $
              </span>
              <Input
                id="price"
                type="number"
                placeholder="0.00"
                min="1"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                className="pl-7"
              />
            </div>
            {priceCents > 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Info className="h-3 w-3" />
                5% platform fee ({formatAUD(commission)}) — you&apos;ll receive approx.{" "}
                <strong className="text-olive">{formatAUD(sellerPayout)}</strong>
              </p>
            )}
          </div>

          {/* Category */}
          {(() => {
            const activeCatConfig = CATEGORIES.find((c) => c.value === form.category);
            return (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>
                    Category <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => {
                      set("category", v);
                      set("subcategory", "");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {(activeCatConfig?.groups ?? []).length > 0 && (
                  <div className="space-y-1.5">
                    <Label>Type</Label>
                    <Select
                      value={form.subcategory}
                      onValueChange={(v) => set("subcategory", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeCatConfig!.groups.map((group) => (
                          <SelectGroup key={group.value}>
                            <SelectItem value={group.value} className="font-medium">
                              {group.label}
                            </SelectItem>
                            {group.items.map((item) => (
                              <SelectItem key={item.value} value={item.value} className="pl-8">
                                {item.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Condition */}
          <div className="space-y-2">
            <Label>
              Condition <span className="text-destructive">*</span>
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {CONDITIONS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("condition", c.value)}
                  className={`text-left rounded-lg border-2 px-4 py-3 transition-colors ${
                    form.condition === c.value
                      ? "border-olive bg-olive/5"
                      : "border-border hover:border-olive/50"
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      form.condition === c.value ? "text-olive" : "text-navy"
                    }`}
                  >
                    {c.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{c.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Brand & Size */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="brand">
                Brand{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="brand"
                placeholder="e.g. Bates, Ariat"
                value={form.brand}
                onChange={(e) => set("brand", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="size">
                Size{" "}
                <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input
                id="size"
                placeholder="e.g. 17.5, M, 8"
                value={form.size}
                onChange={(e) => set("size", e.target.value)}
              />
            </div>
          </div>

          <Button
            className="w-full bg-olive hover:bg-olive-light text-cream"
            disabled={!canProceedToDelivery}
            onClick={() => setStep("delivery")}
          >
            Continue to Delivery
          </Button>
        </div>
      )}

      {/* ── Step 2: Delivery ── */}
      {step === "delivery" && (
        <div className="space-y-6">
          {/* Shipping */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-navy">Shipping</Label>
                <p className="text-xs text-muted-foreground">Buyer covers shipping costs</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.allowsShipping}
                onClick={() => set("allowsShipping", !form.allowsShipping)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.allowsShipping ? "bg-olive" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.allowsShipping ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {form.allowsShipping && (
              <div className="pl-4 border-l-2 border-olive/20 space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="shippingPrice">
                    Shipping cost (AUD) <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="shippingPrice"
                      type="number"
                      placeholder="0.00 for free shipping"
                      min="0"
                      step="0.01"
                      value={form.shippingPrice}
                      onChange={(e) => set("shippingPrice", e.target.value)}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="shippingNotes">
                    Shipping notes{" "}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="shippingNotes"
                    placeholder="e.g. Via Australia Post, express available on request"
                    value={form.shippingNotes}
                    onChange={(e) => set("shippingNotes", e.target.value)}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Not sure what to charge?{" "}
                  <a
                    href="https://auspost.com.au/parcels-mail/calculate-postage-delivery-times/#/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-olive underline hover:text-olive/80"
                  >
                    Estimate with Australia Post
                  </a>
                  {" "}— use any destination postcode for a rough guide.
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Local pickup */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold text-navy">Local Pickup</Label>
                <p className="text-xs text-muted-foreground">
                  Payment still processed through the platform
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.allowsPickup}
                onClick={() => set("allowsPickup", !form.allowsPickup)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  form.allowsPickup ? "bg-olive" : "bg-muted"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    form.allowsPickup ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {!form.allowsShipping && !form.allowsPickup && (
            <p className="text-sm text-destructive">
              Please enable at least one delivery option.
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep("details")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-olive hover:bg-olive-light text-cream"
              disabled={!canProceedToReview}
              onClick={() => setStep("review")}
            >
              Review Listing
            </Button>
          </div>
        </div>
      )}

      {/* ── Step 3: Review ── */}
      {step === "review" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-border overflow-hidden">
            {/* Image preview */}
            {images[0] && (
              <div className="relative aspect-video">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={images[0].preview}
                  alt="Cover"
                  className="w-full h-full object-cover"
                />
                {images.length > 1 && (
                  <span className="absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white">
                    +{images.length - 1} more
                  </span>
                )}
              </div>
            )}
            <div className="p-5 space-y-4">
              <div>
                <p className="text-2xl font-bold text-navy">{formatAUD(priceCents)}</p>
                <h2 className="text-lg font-semibold text-navy mt-1">{form.title}</h2>
              </div>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Category</span>
                <span className="font-medium text-navy capitalize">
                  {form.subcategory
                    ? getSubcategoryLabel(form.subcategory)
                    : getCategoryLabel(form.category)}
                </span>
                <span className="text-muted-foreground">Condition</span>
                <span className="font-medium text-navy">
                  {CONDITIONS.find((c) => c.value === form.condition)?.label}
                </span>
                {form.brand && (
                  <>
                    <span className="text-muted-foreground">Brand</span>
                    <span className="font-medium text-navy">{form.brand}</span>
                  </>
                )}
                {form.size && (
                  <>
                    <span className="text-muted-foreground">Size</span>
                    <span className="font-medium text-navy">{form.size}</span>
                  </>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="font-medium text-navy">
                  {form.allowsShipping
                    ? shippingCents === 0
                      ? "Free"
                      : formatAUD(shippingCents)
                    : "Not available"}
                </span>
                <span className="text-muted-foreground">Local pickup</span>
                <span className="font-medium text-navy">
                  {form.allowsPickup ? "Available" : "Not available"}
                </span>
              </div>
              <Separator />
              <div className="rounded-lg bg-olive/5 p-4 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Listing price</span>
                  <span>{formatAUD(priceCents)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping cost</span>
                  <span>{form.allowsShipping ? `+${formatAUD(shippingCents)}` : "—"}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Platform fee (5%)</span>
                  <span>-{formatAUD(commission)}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-navy border-t border-border pt-1 mt-1">
                  <span>You receive (approx.)</span>
                  <span className="text-olive">{formatAUD(sellerPayout)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setStep("delivery")}
            >
              Back
            </Button>
            <Button
              className="flex-1 bg-olive hover:bg-olive-light text-cream"
              onClick={handlePublish}
              disabled={saving}
            >
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {saving ? "Publishing…" : "Publish Listing"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
