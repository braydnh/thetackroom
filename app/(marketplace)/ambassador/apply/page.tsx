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

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [ridingBio, setRidingBio] = useState("");
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
    if (!fullName.trim()) { toast.error("Please enter your full name."); return; }
    if (!email.trim()) { toast.error("Please enter your email address."); return; }
    if (!location.trim()) { toast.error("Please enter your location."); return; }
    if (ridingBio.trim().length < 20) { toast.error("Please tell us a bit more about yourself and your riding."); return; }
    if (motivation.trim().length < 20) { toast.error("Please tell us more about why you'd like to be an ambassador."); return; }

    setLoading(true);

    // Combine all fields into a structured motivation string
    const combined = [
      `FULL NAME: ${fullName.trim()}`,
      `EMAIL: ${email.trim()}`,
      `LOCATION: ${location.trim()}`,
      ``,
      `ABOUT ME & MY RIDING:`,
      ridingBio.trim(),
      ``,
      `WHY I'D BE A GREAT AMBASSADOR:`,
      motivation.trim(),
    ].join("\n");

    const res = await fetch("/api/ambassador/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        motivation: combined,
        instagram_handle: instagram,
        tiktok_handle: tiktok,
        facebook_url: facebook,
        follower_count: followers || null,
      }),
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
      <div className="mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-olive/10 mb-4">
          <Star className="h-6 w-6 text-olive" />
        </div>
        <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Become a The Tack Room Ambassador
        </h1>
        <p className="text-muted-foreground leading-relaxed">
          The Tack Room Ambassador Program is designed for passionate equestrians who believe in shopping smarter and supporting a more sustainable horse community.
        </p>
      </div>

      {/* Welcome message */}
      <div className="rounded-xl border border-olive/20 bg-olive/5 p-6 mb-8 space-y-5 text-sm text-navy/80 leading-relaxed">
        <p>
          Our ambassadors help us grow by sharing their genuine buying and selling experiences while representing The Tack Room within their own riding circles.
        </p>

        <hr className="border-olive/20" />

        <div className="space-y-3">
          <p className="font-semibold text-navy">What We Ask From Our Ambassadors</p>
          <p>As a The Tack Room Ambassador, you will:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              "Share your buying and selling experience on the platform",
              "Post stories, TikToks or reels featuring your listings or purchases",
              "Engage with and support The Tack Room on social media",
              "Promote The Tack Room within your local equestrian community",
              "Represent the brand in a positive and authentic way",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-olive flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>We value consistency, creativity, and genuine enthusiasm for pre-loved tack.</p>
        </div>

        <hr className="border-olive/20" />

        <div className="space-y-3">
          <p className="font-semibold text-navy">Ambassador Perks</p>
          <p>In return for your support, ambassadors receive:</p>
          <ul className="space-y-1.5 pl-1">
            {[
              "Early access to new features and launches",
              "Priority access to new campaigns and opportunities",
              "Exclusive selling discounts",
              "Increased exposure through reposts and features on our social channels",
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-olive flex-shrink-0 mt-0.5">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p>We are building something long-term and want our ambassadors to grow with us.</p>
        </div>

        <hr className="border-olive/20" />

        <p>
          Ambassadors are selected on a rolling basis. We encourage applicants to engage with our content and community while applications are being reviewed.
        </p>
        <p>
          We look forward to learning more about you and welcoming the next group of The Tack Room Ambassadors.
        </p>
        <p className="font-medium text-navy">Can&apos;t wait to learn more about you!<br />The Tack Room Team</p>
      </div>

      {existingStatus === "denied" && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Your previous application was not approved. You&apos;re welcome to reapply below.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* 1. Full name */}
        <div className="space-y-1.5">
          <Label htmlFor="fullName">1. Full name <span className="text-destructive">*</span></Label>
          <Input
            id="fullName"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Smith"
            required
          />
        </div>

        {/* 2. Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">2. Email address <span className="text-destructive">*</span></Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            required
          />
        </div>

        {/* 3. Social media */}
        <div className="space-y-3">
          <Label>3. Social media handles <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground -mt-1">Instagram is required; other platforms are optional.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="instagram" className="text-xs text-muted-foreground font-normal">Instagram <span className="text-destructive">*</span></Label>
              <Input id="instagram" placeholder="@yourhandle" value={instagram} onChange={(e) => setInstagram(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tiktok" className="text-xs text-muted-foreground font-normal">TikTok</Label>
              <Input id="tiktok" placeholder="@yourhandle" value={tiktok} onChange={(e) => setTiktok(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="facebook" className="text-xs text-muted-foreground font-normal">Facebook profile/page URL</Label>
              <Input id="facebook" placeholder="facebook.com/..." value={facebook} onChange={(e) => setFacebook(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="followers" className="text-xs text-muted-foreground font-normal">Approx. combined followers</Label>
              <Input id="followers" type="number" placeholder="e.g. 2500" value={followers} onChange={(e) => setFollowers(e.target.value)} min={0} />
            </div>
          </div>
        </div>

        {/* 4. Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">4. Your location (city/state) <span className="text-destructive">*</span></Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Sydney, NSW"
            required
          />
        </div>

        {/* 5. About your riding */}
        <div className="space-y-1.5">
          <Label htmlFor="ridingBio">5. About yourself and your riding <span className="text-destructive">*</span></Label>
          <p className="text-xs text-muted-foreground">What you love, how often you ride, and your discipline(s).</p>
          <Textarea
            id="ridingBio"
            value={ridingBio}
            onChange={(e) => setRidingBio(e.target.value)}
            placeholder="e.g. I've been riding for 12 years, competing in showjumping and dressage. I ride 5 days a week and am passionate about..."
            rows={4}
            required
          />
          <p className="text-xs text-muted-foreground">{ridingBio.length} characters</p>
        </div>

        {/* 6. Why ambassador */}
        <div className="space-y-1.5">
          <Label htmlFor="motivation">6. Why you&apos;d like to be an Ambassador and why you&apos;d be a great fit <span className="text-destructive">*</span></Label>
          <Textarea
            id="motivation"
            value={motivation}
            onChange={(e) => setMotivation(e.target.value)}
            placeholder="Tell us about your involvement in the equestrian community, how you'd promote The Tack Room, and what makes you a great fit..."
            rows={5}
            required
          />
          <p className="text-xs text-muted-foreground">{motivation.length} characters</p>
        </div>

        <Button type="submit" className="bg-olive hover:bg-olive-light text-cream w-full sm:w-auto" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit Application
        </Button>
      </form>
    </div>
  );
}
