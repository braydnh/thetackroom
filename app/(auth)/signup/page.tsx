"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { Loader2, Star, Eye, EyeOff } from "lucide-react";

const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"];

function SignupForm() {
  const searchParams = useSearchParams();
  const isFoundingSeller = searchParams.get("founding") === "true";

  const [step, setStep] = useState<1 | 2>(1);

  // Step 1
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 2
  const [dob, setDob] = useState("");
  const [mobile, setMobile] = useState("");
  const [street, setStreet] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [done, setDone] = useState(false);

  // ── Password strength ──
  const passwordStrength = (() => {
    if (password.length === 0) return null;
    const checks = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[0-9]/.test(password),
      /[^A-Za-z0-9]/.test(password),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 1) return { label: "Weak", color: "bg-red-400", width: "w-1/4" };
    if (score === 2) return { label: "Fair", color: "bg-amber-400", width: "w-2/4" };
    if (score === 3) return { label: "Good", color: "bg-blue-400", width: "w-3/4" };
    return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
  })();

  function validateStep1() {
    if (firstName.trim().length < 2) {
      toast.error("Please enter your first name.");
      return false;
    }
    if (lastName.trim().length < 2) {
      toast.error("Please enter your last name.");
      return false;
    }
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
      toast.error("Username must be 3+ characters — letters, numbers and underscores only.");
      return false;
    }
    if (!email.includes("@")) {
      toast.error("Please enter a valid email address.");
      return false;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return false;
    }
    return true;
  }

  function validateStep2() {
    if (!dob) {
      toast.error("Please enter your date of birth.");
      return false;
    }
    // Must be 16+
    const age = (Date.now() - new Date(dob).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 16) {
      toast.error("You must be at least 16 years old to sign up.");
      return false;
    }
    if (mobile && !/^[\d\s\+\-\(\)]{8,15}$/.test(mobile)) {
      toast.error("Please enter a valid mobile number.");
      return false;
    }
    if (suburb && !state) {
      toast.error("Please select your state.");
      return false;
    }
    if (postcode && !/^\d{4}$/.test(postcode)) {
      toast.error("Australian postcodes are 4 digits.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateStep2()) return;

    setLoading(true);
    const supabase = createClient();

    // Normalize mobile to digits only for consistent storage + uniqueness checks
    const normalizedMobile = mobile ? mobile.replace(/\D/g, "") || null : null;

    // Check mobile uniqueness before creating the auth user
    if (normalizedMobile) {
      const res = await fetch("/api/auth/check-mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mobile: normalizedMobile }),
      });
      const { taken } = await res.json();
      if (taken) {
        toast.error("This mobile number is already registered to an account.");
        setLoading(false);
        return;
      }
    }

    const address = [street, suburb, state, postcode].filter(Boolean).join(", ");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          full_name: `${firstName.trim()} ${lastName.trim()}`,
          dob,
          mobile: normalizedMobile,
          location: [suburb, state].filter(Boolean).join(", ") || null,
          address: address || null,
          is_founding_applicant: isFoundingSeller,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      setDone(true);
    }
    setLoading(false);
  }

  async function handleGoogleSignup() {
    setGoogleLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast.error(error.message);
      setGoogleLoading(false);
    }
  }

  // ── Success state ──
  if (done) {
    return (
      <div className="rounded-2xl bg-white p-8 shadow-xl text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-olive/10">
          <span className="text-2xl">✉️</span>
        </div>
        <h2
          className="text-xl font-bold text-navy mb-2"
          style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
        >
          Check your email
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ve sent a confirmation link to <strong>{email}</strong>.
          Click it to activate your account.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Already confirmed?{" "}
          <Link href="/login" className="text-olive hover:underline">Sign in</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-8 shadow-xl">
      {/* Founding seller banner */}
      {isFoundingSeller && (
        <div className="mb-5 flex items-center gap-2 rounded-lg bg-olive/10 px-3 py-2.5">
          <Star className="h-4 w-4 text-olive flex-shrink-0" />
          <p className="text-xs text-olive font-medium">
            You&apos;re applying as a Founding Seller — your badge will appear once approved.
          </p>
        </div>
      )}

      <h1
        className="text-2xl font-bold text-navy mb-1"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Create your account
      </h1>
      <p className="text-sm text-muted-foreground mb-6">Join the equestrian marketplace</p>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {[
          { n: 1, label: "Account" },
          { n: 2, label: "Details" },
        ].map(({ n, label }, i, arr) => (
          <div key={n} className="flex items-center gap-2 flex-1">
            <div className="flex items-center gap-2">
              <div className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                step === n ? "bg-olive text-cream" : step > n ? "bg-olive/30 text-olive" : "bg-muted text-muted-foreground"
              }`}>{n}</div>
              <span className={`text-xs font-medium ${step === n ? "text-navy" : "text-muted-foreground"}`}>{label}</span>
            </div>
            {i < arr.length - 1 && (
              <div className={`flex-1 h-px ${step > n ? "bg-olive/40" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── Step 1: Account ── */}
      {step === 1 && (
        <>
          {/* Google OAuth */}
          <Button
            type="button"
            variant="outline"
            className="w-full gap-2 mb-4"
            onClick={handleGoogleSignup}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="relative mb-5">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-muted-foreground">or</span>
          </div>

          <div className="space-y-4">
            {/* First + Last name */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  type="text"
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Smith"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="janesmith"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                autoComplete="username"
                maxLength={30}
                required
              />
              <p className="text-xs text-muted-foreground">Letters, numbers and underscores only</p>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Strength bar */}
              {passwordStrength && (
                <div className="space-y-1">
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${passwordStrength.color} ${passwordStrength.width}`} />
                  </div>
                  <p className={`text-xs ${passwordStrength.color.replace("bg-", "text-")}`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  className={`pr-10 ${confirmPassword && confirmPassword !== password ? "border-red-400 focus-visible:ring-red-400" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
                  tabIndex={-1}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500">Passwords don&apos;t match</p>
              )}
            </div>

            <Button
              type="button"
              className="w-full bg-olive hover:bg-olive-light text-cream"
              onClick={() => validateStep1() && setStep(2)}
            >
              Continue
            </Button>
          </div>
        </>
      )}

      {/* ── Step 2: Personal Details ── */}
      {step === 2 && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* DOB */}
          <div className="space-y-1.5">
            <Label htmlFor="dob">Date of birth <span className="text-destructive">*</span></Label>
            <Input
              id="dob"
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              max={new Date(Date.now() - 16 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}
              required
            />
            <p className="text-xs text-muted-foreground">You must be at least 16 years old</p>
          </div>

          {/* Mobile */}
          <div className="space-y-1.5">
            <Label htmlFor="mobile">
              Mobile number <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="mobile"
              type="tel"
              placeholder="04xx xxx xxx"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <Separator />

          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Address <span className="normal-case font-normal">(optional — used for shipping)</span>
          </p>

          {/* Street */}
          <div className="space-y-1.5">
            <Label htmlFor="street">Street address</Label>
            <Input
              id="street"
              type="text"
              placeholder="123 Station Road"
              value={street}
              onChange={(e) => setStreet(e.target.value)}
              autoComplete="street-address"
            />
          </div>

          {/* Suburb + State */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="suburb">Suburb / Town</Label>
              <Input
                id="suburb"
                type="text"
                placeholder="Scone"
                value={suburb}
                onChange={(e) => setSuburb(e.target.value)}
                autoComplete="address-level2"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <select
                id="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-olive"
                autoComplete="address-level1"
              >
                <option value="">State</option>
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Postcode */}
          <div className="space-y-1.5">
            <Label htmlFor="postcode">Postcode</Label>
            <Input
              id="postcode"
              type="text"
              placeholder="2337"
              value={postcode}
              onChange={(e) => setPostcode(e.target.value.replace(/\D/g, "").slice(0, 4))}
              maxLength={4}
              autoComplete="postal-code"
              className="w-28"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-olive hover:bg-olive-light text-cream"
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create account
            </Button>
          </div>
        </form>
      )}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        By signing up you agree to our{" "}
        <Link href="/terms" className="text-olive hover:underline">Terms of Service</Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-olive hover:underline">Privacy Policy</Link>.
      </p>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="text-olive font-medium hover:underline">Sign in</Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="rounded-2xl bg-white p-8 shadow-xl h-96 animate-pulse" />}>
      <SignupForm />
    </Suspense>
  );
}
