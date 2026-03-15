"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Mail, Instagram, Facebook } from "lucide-react";

export default function ContactPage() {
  const searchParams = useSearchParams();
  const isReport = searchParams.get("type") === "report";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(isReport ? "Bug / Issue Report" : "");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (isReport) setSubject("Bug / Issue Report");
  }, [isReport]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, subject, message, type: isReport ? "report" : "contact" }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      toast.error("Failed to send — please email us directly at contact@tackroomshop.com.au");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        {isReport ? "Report a Problem" : "Contact Us"}
      </h1>
      <p className="text-muted-foreground mb-8">
        {isReport
          ? "Found a bug or something not working right? Let us know and we'll get it fixed."
          : "Got a question, issue, or just want to say hello? We'd love to hear from you."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {/* Contact form */}
        <div className="sm:col-span-2">
          {sent ? (
            <div className="rounded-xl border border-border p-8 text-center">
              <p className="text-2xl mb-3">✅</p>
              <h2 className="font-semibold text-navy mb-1">
                {isReport ? "Report received" : "Message sent"}
              </h2>
              <p className="text-sm text-muted-foreground">
                Thanks {name.split(" ")[0]}! We'll get back to you at {email} within 1 business day.
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
                <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder={isReport ? "What's the issue?" : "How can we help?"} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="message">{isReport ? "Describe the problem" : "Message"}</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isReport ? "What were you doing when it happened? What did you expect vs what occurred?" : "Tell us what's on your mind..."}
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="bg-olive hover:bg-olive-light text-cream" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isReport ? "Submit report" : "Send message"}
              </Button>
            </form>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-navy mb-2">Email</h3>
            <a href="mailto:contact@tackroomshop.com.au" className="flex items-center gap-2 text-sm text-olive hover:underline">
              <Mail className="h-4 w-4" /> contact@tackroomshop.com.au
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
