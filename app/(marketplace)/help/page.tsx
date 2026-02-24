import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Help Centre" };

const faqs = [
  {
    category: "Buying",
    items: [
      { q: "How do I know if a listing is still available?", a: "Listings showing as 'Active' are available to buy. Once someone purchases an item it moves to 'Reserved' and will no longer be visible to other buyers." },
      { q: "Is my payment secure?", a: "Yes. All payments are processed by Stripe, which holds your funds in escrow until your item is delivered and you've had 48 hours to raise any issues." },
      { q: "What if my item doesn't arrive or isn't as described?", a: "Go to My Orders, open the relevant order, and click 'Report an Issue' within 48 hours of the tracking showing delivered. Our team reviews every dispute." },
      { q: "Can I buy with local pickup?", a: "Yes, if the seller has enabled local pickup on their listing you'll see that option at checkout. Funds are released to the seller immediately on pickup confirmation." },
    ],
  },
  {
    category: "Selling",
    items: [
      { q: "How do I start selling?", a: "Create an account, go to your Seller Dashboard, and complete the Stripe Connect setup (takes ~5 minutes). Once connected you can publish listings." },
      { q: "How much does it cost to sell?", a: "Listing is free. We charge a 5% commission on each completed sale. Stripe's processing fee (~1.7% + $0.30) is deducted separately." },
      { q: "When do I get paid?", a: "Payouts are processed automatically 48 hours after your buyer confirms delivery (or 48 hours after the delivery event, if no action is taken). Funds arrive in your bank account within 2–3 business days depending on your bank." },
      { q: "How long do I have to ship?", a: "You have 3 business days from when an order is confirmed to submit a tracking number. If tracking isn't submitted in time, the buyer will be offered a refund." },
      { q: "Can I offer local pickup only?", a: "Yes. When creating a listing, you can enable 'Local Pickup' and disable shipping, or offer both options." },
    ],
  },
  {
    category: "Account",
    items: [
      { q: "How do I reset my password?", a: "Click 'Forgot password?' on the login page. We'll send a reset link to your email address." },
      { q: "Can I change my username?", a: "Yes — go to Settings and update your display name. Note: your username (used in your profile URL) cannot currently be changed after signup." },
      { q: "How do I delete my account?", a: "Email us at thetackroom.au@gmail.com with your request. We'll process it within 5 business days." },
    ],
  },
  {
    category: "Messaging",
    items: [
      { q: "Why can't I share my phone number or email in messages?", a: "To protect both buyers and sellers, sharing personal contact details in messages is not permitted. All communication and transactions should happen through the Platform, which ensures both parties are protected." },
      { q: "Can I message a seller before buying?", a: "Yes — on any listing page, click the 'Message Seller' button to start a conversation." },
    ],
  },
];

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Help Centre
      </h1>
      <p className="text-muted-foreground mb-10">Answers to the most common questions.</p>

      <div className="space-y-10">
        {faqs.map((section) => (
          <div key={section.category}>
            <h2 className="text-lg font-semibold text-navy mb-4 border-b border-border pb-2">{section.category}</h2>
            <div className="space-y-5">
              {section.items.map((item) => (
                <div key={item.q}>
                  <h3 className="font-medium text-navy mb-1">{item.q}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 rounded-xl bg-muted/50 border border-border p-6 text-center">
        <p className="text-sm text-muted-foreground mb-3">Can&apos;t find your answer?</p>
        <Link href="/contact" className="inline-block rounded-md bg-olive px-5 py-2.5 text-sm font-medium text-cream hover:bg-olive-light transition-colors">
          Contact us
        </Link>
      </div>
    </div>
  );
}
