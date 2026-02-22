import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Heart, ShieldCheck, Zap } from "lucide-react";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-navy mb-4" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Let your gear find its second stride.
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          The Tack Room AU is Australia&apos;s dedicated marketplace for second-hand equestrian equipment — built by horse people, for horse people.
        </p>
      </div>

      {/* Story */}
      <div className="mb-10 space-y-4 text-muted-foreground leading-relaxed">
        <p>
          Every stable has that corner — the pile of gear that no longer fits, that your horse grew out of, or that&apos;s just been collecting dust since you upgraded. Good quality equipment sitting unused when someone else could be using it.
        </p>
        <p>
          We built The Tack Room to fix that. A simple, trusted place where the equestrian community can buy and sell pre-loved gear — saddles, bridles, rugs, clothing, helmets — without the faff of Facebook groups or generic classifieds.
        </p>
        <p>
          Everything is designed around the way equestrians actually shop: detailed condition descriptions, proper size filters, seller profiles with ratings, and secure payments with built-in buyer protection. No more chasing strangers for bank transfers.
        </p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        {[
          {
            icon: Heart,
            title: "Community first",
            desc: "We're part of the equestrian community. Our Founding Sellers program recognises the people who helped build this platform.",
          },
          {
            icon: ShieldCheck,
            title: "Safe by design",
            desc: "Payments are held in escrow by Stripe until delivery is confirmed. Buyer protection is built into every transaction.",
          },
          {
            icon: Zap,
            title: "Fair for sellers",
            desc: "Low commission rates. Fast payouts. No hidden fees. Sellers keep most of what they earn.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border p-5">
            <Icon className="h-5 w-5 text-olive mb-3" />
            <h3 className="font-semibold text-navy mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="rounded-xl bg-olive px-8 py-10 text-center">
        <h2 className="text-xl font-bold text-cream mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Ready to ride?
        </h2>
        <p className="text-sm text-cream/70 mb-6">Join Australia&apos;s equestrian marketplace today.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button className="bg-cream text-olive hover:bg-cream/90" asChild>
            <Link href="/listings">Shop Now</Link>
          </Button>
          <Button className="bg-transparent border border-cream/60 text-cream hover:bg-olive-light" asChild>
            <Link href="/signup">Start Selling</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
