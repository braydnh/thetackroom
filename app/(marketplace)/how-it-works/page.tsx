import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "How It Works" };

const buySteps = [
  { n: "01", title: "Find your item", desc: "Browse by category or search by keyword, brand, size, condition, or price. Filter to find exactly what you need." },
  { n: "02", title: "Check the details", desc: "Read the description, view photos, and check the seller's rating and profile. Message the seller if you have questions." },
  { n: "03", title: "Buy securely", desc: "Pay by card through Stripe. Your payment is held in escrow — the seller doesn't receive funds until you confirm delivery." },
  { n: "04", title: "Receive and confirm", desc: "Once your item arrives, you have 48 hours to raise any issues. If all is good, the seller gets paid automatically." },
];

const sellSteps = [
  { n: "01", title: "Connect your bank", desc: "Set up Stripe payouts once — takes about 5 minutes. You only need to do this once." },
  { n: "02", title: "Create a listing", desc: "Upload up to 8 photos, write a description, set your price and postage. Publish when you're ready." },
  { n: "03", title: "Sell and ship", desc: "When your item sells, you'll receive an email. Ship within 3 business days and enter the tracking number." },
  { n: "04", title: "Get paid", desc: "Once the buyer confirms delivery (or 48 hours pass without a dispute), your payout lands in your bank account." },
];

export default function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2 text-center" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        How It Works
      </h1>
      <p className="text-muted-foreground text-center mb-12">Simple, safe buying and selling for the equestrian community.</p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Buying */}
        <div>
          <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-olive text-cream text-xs font-bold">B</span>
            Buying
          </h2>
          <div className="space-y-6">
            {buySteps.map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="text-2xl font-bold text-olive/20 w-10 flex-shrink-0">{step.n}</div>
                <div>
                  <h3 className="font-semibold text-navy mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
              <Link href="/listings">Browse Listings</Link>
            </Button>
          </div>
        </div>

        {/* Selling */}
        <div>
          <h2 className="text-xl font-bold text-navy mb-6 flex items-center gap-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy text-cream text-xs font-bold">S</span>
            Selling
          </h2>
          <div className="space-y-6">
            {sellSteps.map((step) => (
              <div key={step.n} className="flex gap-4">
                <div className="text-2xl font-bold text-navy/20 w-10 flex-shrink-0">{step.n}</div>
                <div>
                  <h3 className="font-semibold text-navy mb-1">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-8">
            <Button className="bg-navy hover:bg-navy/90 text-cream" asChild>
              <Link href="/signup">Start Selling</Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Fees */}
      <div className="mt-14 rounded-xl bg-muted/50 border border-border p-6">
        <h2 className="text-lg font-semibold text-navy mb-3">Fees</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div><p className="font-medium text-navy">Listing fee</p><p className="text-muted-foreground">Free — always</p></div>
          <div><p className="font-medium text-navy">Seller commission</p><p className="text-muted-foreground">5% of sale price (locked at checkout)</p></div>
          <div><p className="font-medium text-navy">Payment processing</p><p className="text-muted-foreground">Stripe fee (~1.7% + $0.30) deducted automatically</p></div>
        </div>
        <p className="text-xs text-muted-foreground mt-4">Example: A $150 saddle pad → seller receives approximately $139.65 after commission and Stripe fees.</p>
      </div>
    </div>
  );
}
