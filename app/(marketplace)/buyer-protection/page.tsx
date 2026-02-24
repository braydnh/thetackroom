import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Clock, AlertCircle, CheckCircle } from "lucide-react";

export const metadata: Metadata = { title: "Buyer Protection" };

export default function BuyerProtectionPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="text-center mb-12">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-olive/10 mb-4">
          <ShieldCheck className="h-7 w-7 text-olive" />
        </div>
        <h1 className="text-3xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Buyer Protection
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Every purchase on The Tack Room AU is protected. Your payment is held securely until you confirm you&apos;re happy with your item.
        </p>
      </div>

      {/* How it works */}
      <div className="space-y-4 mb-12">
        {[
          {
            icon: ShieldCheck,
            title: "Your payment is held in escrow",
            desc: "When you pay, your money goes to Stripe — not the seller. It stays there until your item arrives and you confirm receipt. Stripe Payments Australia Pty Ltd (AFSL No. 458965) holds the funds.",
          },
          {
            icon: Clock,
            title: "48-hour dispute window",
            desc: "Once your tracking shows as delivered, you have 48 hours to raise an issue. If something is wrong — item not as described, damaged, or didn't arrive — open a dispute through your order page.",
          },
          {
            icon: AlertCircle,
            title: "Raise a dispute if something's wrong",
            desc: "Go to My Orders → select your order → \"Report an issue\". Our team reviews every dispute and will either issue a refund or release funds to the seller.",
          },
          {
            icon: CheckCircle,
            title: "Automatic payout when all is good",
            desc: "If no dispute is raised within 48 hours, the seller is paid automatically. You don't need to do anything.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex gap-4 rounded-xl border border-border p-5">
            <Icon className="h-5 w-5 text-olive flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-navy mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* What's covered */}
      <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-6 mb-8">
        <h2 className="font-semibold text-emerald-900 mb-3">What&apos;s covered</h2>
        <ul className="space-y-1.5 text-sm text-emerald-800">
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> Item significantly not as described</li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> Item arrives damaged</li>
          <li className="flex items-start gap-2"><CheckCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /> Item never arrives (tracking not updated within 3 days)</li>
        </ul>
      </div>

      <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 mb-10">
        <h2 className="font-semibold text-amber-900 mb-3">What&apos;s not covered</h2>
        <ul className="space-y-1.5 text-sm text-amber-800">
          <li>Change of mind after purchase</li>
          <li>Transactions completed outside the Platform</li>
          <li>Items that match the seller&apos;s description but didn&apos;t meet your personal expectations</li>
        </ul>
      </div>

      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">Questions about a specific order?</p>
        <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
          <Link href="/contact">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}
