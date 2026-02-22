"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [gettingDashboard, setGettingDashboard] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      const { data } = await supabase
        .from("profiles")
        .select("username, display_name, bio, location, avatar_url, stripe_account_id, stripe_onboarding_complete")
        .eq("id", user.id)
        .single();
      if (!data) { setLoading(false); return; }
      setProfile(data);
      setDisplayName(data.display_name ?? "");
      setBio(data.bio ?? "");
      setLocation(data.location ?? "");
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      .eq("id", (await supabase.auth.getUser()).data.user!.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Profile updated");
    }
    setSaving(false);
  }

  async function handleStripePortal() {
    setGettingDashboard(true);
    const res = await fetch("/api/stripe/connect-onboarding", { method: "POST" });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      toast.error("Failed to open Stripe dashboard");
    }
    setGettingDashboard(false);
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-8">
      <h1
        className="text-2xl font-bold text-navy mb-6"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Settings
      </h1>

      {/* Profile settings */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input value={profile?.username ?? ""} disabled className="bg-muted text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Usernames cannot be changed after signup.</p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="displayName">Display name</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={profile?.username}
            maxLength={50}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell buyers a bit about yourself…"
            rows={3}
            maxLength={300}
            className="resize-none"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g. Sydney, NSW"
            maxLength={100}
          />
        </div>

        <Button type="submit" className="w-full bg-olive hover:bg-olive-light text-cream" disabled={saving}>
          {saving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</> : "Save Changes"}
        </Button>
      </form>

      <Separator className="my-8" />

      {/* Payout settings */}
      <div>
        <h2 className="font-semibold text-navy mb-1">Payout Settings</h2>
        <p className="text-xs text-muted-foreground mb-4">
          Manage your Stripe connected account — update bank account details, view payouts, and manage tax info.
        </p>

        {profile?.stripe_onboarding_complete ? (
          <Button
            onClick={handleStripePortal}
            variant="outline"
            className="gap-2"
            disabled={gettingDashboard}
          >
            {gettingDashboard
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <ExternalLink className="h-4 w-4" />
            }
            Open Stripe Dashboard
          </Button>
        ) : (
          <Button asChild className="bg-olive hover:bg-olive-light text-cream gap-2">
            <a href="/selling/onboarding">
              Set up payouts
            </a>
          </Button>
        )}
      </div>

      <Separator className="my-8" />

      {/* Sign out */}
      <div>
        <h2 className="font-semibold text-navy mb-4">Account</h2>
        <form action="/api/auth/signout" method="POST">
          <Button type="submit" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/5">
            Sign out
          </Button>
        </form>
      </div>
    </div>
  );
}
