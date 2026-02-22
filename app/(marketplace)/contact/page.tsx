"use client";

import { Metadata } from "next";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Mail, Instagram, Facebook } from "lucide-react";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Mailto fallback — replace with Resend API call when ready
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:thetackroom.au@gmail.com?subject=${encodeURIComponent(subject || "Enquiry from website")}&body=${body}`;
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Contact Us
      </h1>
      <p className="text-muted-foreground mb-8">
        Got a question, issue, or just want to say hello? We&apos;d love to hear from you.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Contact form */}
        <div className="sm:col-span-2">
          {sent ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-2xl mb-3">✉️</p>
              <h2 className="font-semibold text-navy mb-1">Opening your email app</h2>
              <p className="text-sm text-muted-foreground">
                If it didn&apos;t open, email us directly at{" "}
                <a href="mailto:thetackroom.au@gmail.com" className="text-olive hover:underline">
                  thetackroom.au@gmail.com
                </a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Your name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="How can we help?" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Tell us what&apos;s on your mind..."
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="bg-olive hover:bg-olive-light text-cream" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send message
              </Button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-navy mb-2">Email</h3>
            <a href="mailto:thetackroom.au@gmail.com" className="flex items-center gap-2 text-sm text-olive hover:underline">
              <Mail className="h-4 w-4" /> thetackroom.au@gmail.com
            </a>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy mb-2">Social</h3>
            <div className="space-y-2">
              <a href="https://www.instagram.com/thetackroom.au" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-navy">
                <Instagram className="h-4 w-4" /> @thetackroom.au
              </a>
              <a href="https://www.facebook.com/people/The-Tack-Room-AU" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-navy">
                <Facebook className="h-4 w-4" /> The Tack Room AU
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-navy mb-2">Response time</h3>
            <p className="text-sm text-muted-foreground">We aim to respond within 1 business day.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
