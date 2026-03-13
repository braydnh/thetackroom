"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { formatAUD, calculateSellerPayout } from "@/lib/utils/currency";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Info, ChevronLeft, Trash2, AlertTriangle } from "lucide-react";
import { CATEGORIES } from "@/lib/categories";
import { ImageUpload, type UploadedImage } from "@/components/listings/ImageUpload";
import { compressImage } from "@/lib/utils/images";

const CONDITIONS = [
  { value: "new_with_tags", label: "New with tags", desc: "Unused, tags still attached" },
  { value: "like_new", label: "Like new", desc: "Used once or twice, no signs of wear" },
  { value: "good", label: "Good", desc: "Minor signs of wear, fully functional" },
  { value: "fair", label: "Fair", desc: "Visible wear, still functions well" },
  { value: "worn", label: "Well loved", desc: "Heavy use, clearly visible wear" },
];

interface ExistingListing {
  id: string;
  title: string;
  description: string | null;
  price: number;
  condition: string;
  category: string;
  subcategory: string | null;
  brand: string | null;
  size: string | null;
  status: string;
  allows_shipping: boolean;
  allows_pickup: boolean;
  shipping_price: number;
  shipping_notes: string | null;
  listing_images: { id: string; display_url: string; storage_path: string; sort_order: number; is_primary: boolean }[];
}

export default function EditListingForm({ listing, commissionPct = 5 }: { listing: ExistingListing; commissionPct?: number }) {
  const router = useRouter();

  const [title, setTitle] = useState(listing.title);
  const [description, setDescription] = useState(listing.description ?? "");
  const [price, setPrice] = useState((listing.price / 100).toFixed(2));
  const [category, setCategory] = useState(listing.category);
  const [subcategory, setSubcategory] = useState(listing.subcategory ?? "");
  const [condition, setCondition] = useState(listing.condition);
  const [brand, setBrand] = useState(listing.brand ?? "");
  const [size, setSize] = useState(listing.size ?? "");
  const [allowsShipping, setAllowsShipping] = useState(listing.allows_shipping);
  const [shippingPrice, setShippingPrice] = useState(
    listing.shipping_price > 0 ? (listing.shipping_price / 100).toFixed(2) : ""
  );
  const [shippingNotes, setShippingNotes] = useState(listing.shipping_notes ?? "");
  const [allowsPickup, setAllowsPickup] = useState(listing.allows_pickup);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>(
    [...listing.listing_images]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((img) => ({ id: img.id, preview: img.display_url, url: img.display_url }))
  );

  const priceCents = Math.round(parseFloat(price || "0") * 100);
  const shippingCents = Math.round(parseFloat(shippingPrice || "0") * 100);
  const { commission, sellerPayout } = calculateSellerPayout(priceCents, shippingCents, commissionPct);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || priceCents <= 0 || !category || !condition) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (allowsShipping && shippingPrice.trim() === "") {
      toast.error("Please enter a shipping cost (enter 0 for free shipping).");
      return;
    }
    if (!allowsShipping && !allowsPickup) {
      toast.error("Enable at least one delivery option.");
      return;
    }
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("listings")
        .update({
          title: title.trim(),
          description: description.trim() || null,
          price: priceCents,
          condition: condition as any,
          category: category as any,
          subcategory: subcategory || null,
          brand: brand.trim() || null,
          size: size.trim() || null,
          allows_shipping: allowsShipping,
          shipping_price: allowsShipping ? shippingCents : 0,
          shipping_notes: shippingNotes.trim() || null,
          allows_pickup: allowsPickup,
        })
        .eq("id", listing.id);

      if (error) throw new Error(error.message);

      // Sync images: delete existing rows, re-insert in current order
      await supabase.from("listing_images").delete().eq("listing_id", listing.id);

      const imageRows: {
        listing_id: string;
        storage_path: string;
        display_url: string;
        sort_order: number;
        is_primary: boolean;
      }[] = [];

      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (img.url) {
          // Existing image — preserve as-is
          imageRows.push({
            listing_id: listing.id,
            storage_path: img.url,
            display_url: img.url,
            sort_order: i,
            is_primary: i === 0,
          });
        } else if (img.file) {
          // New image — upload to storage
          const compressed = await compressImage(img.file);
          const ext = compressed.name.split(".").pop() ?? "jpg";
          const path = `${user.id}/${listing.id}/${i}-${Date.now()}.${ext}`;

          const { error: uploadError } = await supabase.storage
            .from("listing-images")
            .upload(path, compressed, { contentType: compressed.type, upsert: false });

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
      }

      if (imageRows.length > 0) {
        const { error: imgError } = await supabase.from("listing_images").insert(imageRows);
        if (imgError) throw new Error(imgError.message);
      }

      toast.success("Listing updated!");
      router.push(`/listings/${listing.id}`);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("listings")
        .update({ status: "deleted" })
        .eq("id", listing.id);

      if (error) throw new Error(error.message);

      toast.success("Listing removed.");
      router.push("/selling");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to remove listing.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-8">
      <Link
        href="/selling"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-navy mb-6"
      >
        <ChevronLeft className="h-4 w-4" /> Seller Dashboard
      </Link>

      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <h1
          className="text-2xl font-bold text-navy"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Edit Listing
        </h1>
        <Button
          variant="outline"
          size="sm"
          className="text-destructive border-destructive/30 hover:bg-destructive/5 gap-1.5"
          onClick={() => setShowDeleteConfirm(true)}
        >
          <Trash2 className="h-3.5 w-3.5" /> Remove listing
        </Button>
      </div>

      {/* Delete confirm */}
      {showDeleteConfirm && (
        <div className="mb-6 rounded-xl border-2 border-destructive/30 bg-destructive/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive">Remove this listing?</p>
              <p className="text-xs text-muted-foreground mt-1">
                This will hide the listing from buyers. This cannot be undone.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-destructive hover:bg-destructive/90 text-white"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Yes, remove"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Photos */}
      <div className="mb-6">
        <p className="text-sm font-medium text-navy mb-2">Photos</p>
        <ImageUpload images={images} onChange={setImages} disabled={saving} />
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="title">
            Title <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
          />
          <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={2000}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground text-right">{description.length}/2000</p>
        </div>

        {/* Price */}
        <div className="space-y-1.5">
          <Label htmlFor="price">
            Price (AUD) <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
            <Input
              id="price"
              type="number"
              placeholder="0.00"
              min="1"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="pl-7"
            />
          </div>
          {priceCents > 0 && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              {commissionPct}% platform fee ({formatAUD(commission)}) — you&apos;ll receive approx.{" "}
              <strong className="text-olive">{formatAUD(sellerPayout)}</strong>
            </p>
          )}
        </div>

        {/* Category */}
        {(() => {
          const activeCatConfig = CATEGORIES.find((c) => c.value === category);
          return (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Category <span className="text-destructive">*</span></Label>
                <Select value={category} onValueChange={(v) => { setCategory(v); setSubcategory(""); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {(activeCatConfig?.groups ?? []).length > 0 && (
                <div className="space-y-1.5">
                  <Label>Type</Label>
                  <Select value={subcategory} onValueChange={setSubcategory}>
                    <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
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
          <Label>Condition <span className="text-destructive">*</span></Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {CONDITIONS.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCondition(c.value)}
                className={`text-left rounded-lg border-2 px-4 py-3 transition-colors ${
                  condition === c.value ? "border-olive bg-olive/5" : "border-border hover:border-olive/50"
                }`}
              >
                <p className={`text-sm font-medium ${condition === c.value ? "text-olive" : "text-navy"}`}>
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
            <Label htmlFor="brand">Brand <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. Bates, Ariat" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="size">Size <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="e.g. 17.5, M, 8" />
          </div>
        </div>

        <Separator />

        {/* Shipping */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <Label className="text-base font-semibold text-navy">Shipping</Label>
              <p className="text-xs text-muted-foreground">Buyer covers shipping costs</p>
            </div>
            <button
              type="button"
              onClick={() => setAllowsShipping(!allowsShipping)}
              className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${allowsShipping ? "bg-olive" : "bg-muted"}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowsShipping ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>
          {allowsShipping && (
            <div className="pl-4 border-l-2 border-olive/20 space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="shippingPrice">
                  Shipping cost (AUD) <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="shippingPrice"
                    type="number"
                    placeholder="0.00 for free shipping"
                    min="0"
                    step="0.01"
                    value={shippingPrice}
                    onChange={(e) => setShippingPrice(e.target.value)}
                    className="pl-7"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shippingNotes">Shipping notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
                <Input
                  id="shippingNotes"
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="e.g. Via Australia Post, express available on request"
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

        {/* Local pickup */}
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <Label className="text-base font-semibold text-navy">Local Pickup</Label>
            <p className="text-xs text-muted-foreground">Payment still processed through the platform</p>
          </div>
          <button
            type="button"
            onClick={() => setAllowsPickup(!allowsPickup)}
            className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${allowsPickup ? "bg-olive" : "bg-muted"}`}
          >
            <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${allowsPickup ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>

        {!allowsShipping && !allowsPickup && (
          <p className="text-sm text-destructive">Please enable at least one delivery option.</p>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1 bg-olive hover:bg-olive-light text-cream"
            disabled={saving}
          >
            {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
