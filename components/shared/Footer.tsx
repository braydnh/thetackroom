import Link from "next/link";
import { Logo } from "./Logo";
import { Instagram, Facebook } from "lucide-react";

const footerLinks = {
  "Marketplace": [
    { label: "Shop All", href: "/listings" },
    { label: "For the Horse", href: "/listings?category=horse" },
    { label: "For the Rider", href: "/listings?category=rider" },
    { label: "Sale & Deals", href: "/listings?category=sale" },
  ],
  "Sell": [
    { label: "List an Item", href: "/selling/listings/new" },
    { label: "Seller Dashboard", href: "/selling" },
    { label: "How it Works", href: "/how-it-works" },
    { label: "Founding Sellers", href: "/founding-sellers" },
    { label: "Become an Ambassador", href: "/ambassador/apply" },
  ],
  "Support": [
    { label: "Help Centre", href: "/help" },
    { label: "Buyer Protection", href: "/buyer-protection" },
    { label: "Contact Us", href: "/contact" },
    { label: "Report an Issue", href: "/contact?type=report" },
  ],
  "Company": [
    { label: "About", href: "/about" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

export function Footer() {
  return (
    <footer className="bg-olive text-cream">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-2 lg:grid-cols-5">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1">
            <Logo variant="full" theme="dark" />
            <p className="mt-4 text-sm text-cream/70 leading-relaxed">
              Where your gear finds its second stride.
            </p>
            <p className="mt-2 text-xs text-cream/50">
              Australia&apos;s equestrian marketplace.
            </p>
            {/* Social links */}
            <div className="mt-5 flex gap-3">
              <a
                href="https://www.instagram.com/thetackroom.au"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-2 text-cream/70 hover:text-cream hover:bg-olive-light transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/people/The-Tack-Room-AU"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-2 text-cream/70 hover:text-cream hover:bg-olive-light transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              {/* TikTok */}
              <a
                href="https://www.tiktok.com/@thetackroom.au"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full p-2 text-cream/70 hover:text-cream hover:bg-olive-light transition-colors"
                aria-label="TikTok"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.28 6.28 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.22 8.22 0 0 0 4.81 1.55V6.8a4.85 4.85 0 0 1-1.04-.11z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-cream/50 mb-4">
                {heading}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-cream/70 hover:text-cream transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 border-t border-olive-light pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-cream/40">
            &copy; {new Date().getFullYear()} The Tack Room. All rights reserved.
          </p>
          <p className="text-xs text-cream/40">
            Payments secured by Stripe. EST. 2026.
          </p>
        </div>
      </div>
    </footer>
  );
}
