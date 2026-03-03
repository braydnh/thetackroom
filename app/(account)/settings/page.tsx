"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, ExternalLink, Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [gettingDashboard, setGettingDashboard] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
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
      setAvatarUrl(data.avatar_url ?? null);
      setLoading(false);
    }
    load();
  }, [supabase, router]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploadingAvatar(true);
    const ext = file.name.split(".").pop();
    const path = `${userId}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true, contentType: file.type });

    if (uploadError) {
      toast.error("Failed to upload photo");
      setUploadingAvatar(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", userId);

    if (updateError) {
      toast.error("Failed to save photo");
    } else {
      setAvatarUrl(publicUrl);
      toast.success("Profile photo updated");
    }
    setUploadingAvatar(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        bio: bio.trim() || null,
        location: location.trim() || null,
      })
      .eq("id", userId);

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

      {/* Avatar */}
      <div className="flex items-center gap-5 mb-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full bg-muted overflow-hidden flex-shrink-0">
            {avatarUrl ? (
              <Image src={avatarUrl} alt="Profile photo" width={80} height={80} className="h-full w-full object-cover" />
            ) : (
              <div className="h-full w-full flex items-center justify-center bg-olive/20">
                <span className="text-2xl font-bold text-olive">
                  {(profile?.username ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-olive text-cream flex items-center justify-center hover:bg-olive-light transition-colors shadow-sm"
          >
            {uploadingAvatar ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Camera className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-navy">Profile photo</p>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            className="text-xs text-olive hover:underline mt-0.5"
          >
            {uploadingAvatar ? "Uploading…" : "Change photo"}
          </button>
          <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG or WebP · Max 5MB</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

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
