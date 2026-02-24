import { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Terms of Service
      </h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="space-y-6 text-sm">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">1. Acceptance</h2>
          <p className="text-muted-foreground leading-relaxed">
            By accessing or using The Tack Room AU (&ldquo;the Platform&rdquo;), you agree to these Terms. If you do not agree, do not use the Platform.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">2. Eligibility</h2>
          <p className="text-muted-foreground leading-relaxed">
            You must be at least 16 years old to use the Platform. By registering, you confirm that the information you provide is accurate and complete.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">3. The Platform&apos;s Role</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Tack Room AU is a marketplace — we connect buyers and sellers of second-hand equestrian equipment. We are not a party to transactions between users and are not responsible for the quality, safety, or legality of listed items.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">4. Seller Obligations</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>You must accurately describe items — condition, brand, size, and any defects.</li>
            <li>You must ship within 3 business days of a confirmed sale, or arrange local pickup promptly.</li>
            <li>You must complete Stripe Connect onboarding to receive payouts.</li>
            <li>Listing counterfeit, stolen, or prohibited items is strictly forbidden.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">5. Buyer Obligations</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Payment is due at checkout and is final unless a dispute is raised within 48 hours of delivery.</li>
            <li>Disputes must be raised through the Platform — not through your bank or payment provider in the first instance.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">6. Fees and Commission</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Platform charges a commission on each completed sale. The current rate is displayed at checkout and locked at the time of sale. Stripe payment processing fees apply separately.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">7. Payments and Escrow</h2>
          <p className="text-muted-foreground leading-relaxed">
            All payments are processed by Stripe. Funds are held by Stripe until delivery is confirmed, at which point a 48-hour dispute window opens. If no dispute is raised, the seller is paid automatically. The Platform itself does not hold your money.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">8. Prohibited Conduct</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Sharing personal contact information (phone, email, social handles) in messages to circumvent the Platform.</li>
            <li>Harassment, abuse, or threatening behaviour toward other users.</li>
            <li>Creating multiple accounts to evade suspension.</li>
            <li>Manipulating reviews or ratings.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">9. Intellectual Property</h2>
          <p className="text-muted-foreground leading-relaxed">
            You retain ownership of photos and content you post. By posting, you grant us a non-exclusive licence to display that content on the Platform. Do not post content that infringes others&apos; rights.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">10. Limitation of Liability</h2>
          <p className="text-muted-foreground leading-relaxed">
            To the fullest extent permitted by Australian law, The Tack Room AU is not liable for any indirect, incidental, or consequential damages arising from use of the Platform. Our aggregate liability is limited to the fees paid by you in the 3 months preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">11. Governing Law</h2>
          <p className="text-muted-foreground leading-relaxed">
            These Terms are governed by the laws of New South Wales, Australia. Disputes will be resolved in the courts of NSW.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">12. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions? Email <a href="mailto:thetackroom.au@gmail.com" className="text-olive hover:underline">thetackroom.au@gmail.com</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
