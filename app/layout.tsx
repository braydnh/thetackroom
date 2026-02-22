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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body className={`${inter.variable} ${playfair.variable} font-sans antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
