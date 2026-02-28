import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "The Tack Room AU — Second Hand Horse Equipment",
    template: "%s | The Tack Room AU",
  },
  description:
    "Buy and sell pre-loved equestrian gear. Saddles, bridles, rugs, riding clothing and more. Let your gear find its second stride.",
  keywords: ["horse equipment", "equestrian", "tack", "second hand", "used saddles", "horse rugs", "Australia"],
  openGraph: {
    siteName: "The Tack Room AU",
    locale: "en_AU",
    type: "website",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "The Tack Room AU",
  url: "https://www.tackroomshop.com.au",
  logo: "https://www.tackroomshop.com.au/apple-touch-icon.png",
  sameAs: [
    "https://www.instagram.com/thetackroom.au",
    "https://www.facebook.com/people/The-Tack-Room-AU",
    "https://www.tiktok.com/@thetackroom.au",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
