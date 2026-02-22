"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle } from "lucide-react";

export default function AmbassadorApplyPage() {
  const router = useRouter();
  const supabase = createClient();

  const [checking, setChecking] = useState(true);
  const [existingStatus, setExistingStatus] = useState<"pending" | "approved" | "denied" | null>(null);

  const [motivation, setMotivation] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [facebook, setFacebook] = useState("");
  const [followers, setFollowers] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login?next=/ambassador/apply"); return; }

      const { data } = await supabase
        .from("ambassador_applications")
        .select("status")
        .eq("user_id", user.id)
        .single();

      setExistingStatus((data?.status as any) ?? null);
      setChecking(false);
    })();
  }, [supabase, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (motivation.trim().length < 20) {
      toast.error("Please tell us a bit more about why you'd like to be an ambassador.");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/ambassador/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivation, instagram_handle: instagram, tiktok_handle: tiktok, facebook_url: facebook, follower_count: followers || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Something went wrong.");
    } else {
      setSubmitted(true);
    }
    setLoading(false);
  }

  if (checking) {
    return <div className="mx-auto max-w-2xl px-4 py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (existingStatus === "approved") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>You&apos;re an Ambassador</h1>
        <p className="text-muted-foreground">Your ambassador status is already active. Thank you for being part of The Tack Room team!</p>
      </div>
    );
  }

  if (submitted || existingStatus === "pending") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <Star className="h-12 w-12 text-olive mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>Application received</h1>
        <p className="text-muted-foreground mb-4">
          Thanks for applying! We review ambassador applications manually and will be in touch via your account email.
        </p>
        <p className="text-sm text-muted-foreground">Usually reviewed within 3–5 business days.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="mb-8">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-olive/10 mb-4">
          <Star className="h-6 w-6 text-olive" />
        </div>
        <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Become an Ambassador
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          Love equestrian sport and want to support the community? Apply to become a Tack Room Ambassador and earn <strong>50% off your seller commission</strong> on every sale.
        </p>
      </div>

      {/* Benefits callout */}
      <div className="rounded-xl bg-olive/5 border border-olive/20 p-5 mb-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
        <div><p className="font-medium text-navy">50% off commission</p><p className="text-muted-foreground">Pay just 2.5% instead of 5% on every sale</p></div>
        <div><p className="font-medium text-navy">Ambassador badge</p><p className="text-muted-foreground">Displayed on your profile and listings</p></div>
        <div><p className="font-medium text-navy">Community role</p><p className="text-muted-foreground">Help grow Australia&apos;s equestrian marketplace</p></div>
      </div>

      {existingStatus === "denied" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your previous application was not approved. You&apos;re welcome to reapply below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-1.5">
          <Label htmlFor="motivation">Why do you want to be a Tack Room Ambassador? <span className="text-destructive">*</span></Label>
          <Textarea
            id="motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Tell us about your involvement in the equestrian community, how you'd promote The Tack Room, and what makes you a great fit..."
            rows={5}
            required
          />
          <p className="text-xs text-muted-foreground">{motivation.length} characters (minimum 20)</p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-navy">Social media handles <span className="font-normal text-muted-foreground">(optional — helps us review your application)</span></p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="instagram">Instagram</Label>
              <Input id="instagram" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok">TikTok</Label>
              <Input id="tiktok" placeholder="@yourhandle" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook">Facebook profile/page URL</Label>
              <Input id="facebook" placeholder="facebook.com/..." value={facebook} onChange={(e) => setFacebook(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followers">Approx. combined followers</Label>
              <Input id="followers" type="number" placeholder="e.g. 2500" value={followers} onChange={(e) => setFollowers(e.target.value)} min={0} />
            </div>
          </div>
        </div>

        <Button type="submit" className="bg-olive hover:bg-olive-light text-cream w-full sm:w-auto" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Application
        </Button>
      </form>
    </div>
  );
}
