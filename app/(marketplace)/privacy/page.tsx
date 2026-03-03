import { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-navy mb-2" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
        Privacy Policy
      </h1>
      <p className="text-sm text-muted-foreground mb-8">Last updated: February 2026</p>

      <div className="prose prose-sm max-w-none text-foreground space-y-6">
        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">1. Who We Are</h2>
          <p className="text-muted-foreground leading-relaxed">
            The Tack Room AU (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates an online marketplace for second-hand equestrian equipment in Australia. Our platform is available at tackroomshop.com.au.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">2. Information We Collect</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li><strong>Account information:</strong> name, email address, username, date of birth, mobile number, and address when you register.</li>
            <li><strong>Listing data:</strong> photos, descriptions, prices, and other details you provide when creating listings.</li>
            <li><strong>Transaction data:</strong> order history, payment method type (processed securely by Stripe — we never store card numbers), shipping addresses.</li>
            <li><strong>Communications:</strong> messages sent through our in-platform messaging system.</li>
            <li><strong>Usage data:</strong> pages visited, search queries, device type, and IP address for security and analytics.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">3. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
            <li>To operate and improve the marketplace.</li>
            <li>To facilitate transactions between buyers and sellers.</li>
            <li>To send transactional emails (order confirmations, shipping updates, payout notifications).</li>
            <li>To verify your identity and prevent fraud.</li>
            <li>To comply with our legal obligations under Australian law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">4. Payments</h2>
          <p className="text-muted-foreground leading-relaxed">
            All payments are processed by Stripe Payments Australia Pty Ltd (AFSL No. 458965). We do not store your card or bank account details. Seller payouts are managed through Stripe Connect.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">5. Sharing Your Information</h2>
          <p className="text-muted-foreground leading-relaxed">
            We do not sell your personal information. We share data with:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted-foreground mt-2">
            <li><strong>Stripe</strong> — payment processing and seller onboarding.</li>
            <li><strong>Supabase</strong> — database and authentication hosting.</li>
            <li><strong>Resend</strong> — transactional email delivery.</li>
            <li><strong>AfterShip</strong> — shipment tracking.</li>
            <li>Law enforcement or regulators when required by law.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">6. Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            We retain your account data for as long as your account is active. Transaction records are kept for 7 years for tax and legal compliance. You may request deletion of your account by contacting us.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">7. Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            Under the Australian Privacy Act 1988 (Cth), you have the right to access, correct, or request deletion of your personal information. Contact us at <a href="mailto:contact@tackroomshop.com.au" className="text-olive hover:underline">contact@tackroomshop.com.au</a>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">8. Cookies</h2>
          <p className="text-muted-foreground leading-relaxed">
            We use essential cookies to keep you signed in and maintain your session. We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-navy mb-2">9. Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about this policy? Email <a href="mailto:contact@tackroomshop.com.au" className="text-olive hover:underline">contact@tackroomshop.com.au</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
