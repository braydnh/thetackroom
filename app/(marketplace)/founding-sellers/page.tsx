import { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Star, Zap, Users, Heart } from "lucide-react";

export const metadata: Metadata = { title: "Founding Sellers" };

export default function FoundingSellersPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-olive/10 mb-4">
          <Star className="h-7 w-7 text-olive" />
        </div>
        <h1 className="text-3xl font-bold text-navy mb-3" style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}>
          Founding Sellers
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Be part of the team that launched Australia&apos;s equestrian marketplace. Founding Sellers get exclusive benefits — forever.
        </p>
      </div>

      {/* Benefits */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-12">
        {[
          {
            icon: Star,
            title: "Founding Seller badge",
            desc: "A permanent badge on your profile and every listing, showing buyers you were here from day one.",
          },
          {
            icon: Zap,
            title: "Priority in search",
            desc: "Founding Seller listings receive a small boost in search rankings during the launch period.",
          },
          {
            icon: Users,
            title: "Direct input",
            desc: "Early access to new features and a direct line to the team. Your feedback shapes the platform.",
          },
          {
            icon: Heart,
            title: "Community recognition",
            desc: "Be featured in our launch story on social media and in our newsletter.",
          },
        ].map(({ icon: Icon, title, desc }) => (
          <div key={title} className="rounded-xl border border-border p-5">
            <Icon className="h-5 w-5 text-olive mb-3" />
            <h3 className="font-semibold text-navy mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* How to qualify */}
      <div className="rounded-xl bg-olive/5 border border-olive/20 p-6 mb-10">
        <h2 className="font-semibold text-navy mb-3">How to qualify</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">
          The Founding Sellers program is invite-only during our pre-launch period. If your email is on our list, your badge will be applied automatically when you sign up.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To request inclusion, reach out to us on Instagram{" "}
          <a href="https://www.instagram.com/thetackroom.au" className="text-olive hover:underline" target="_blank" rel="noopener noreferrer">@thetackroom.au</a>{" "}
          or email{" "}
          <a href="mailto:thetackroom.au@gmail.com" className="text-olive hover:underline">thetackroom.au@gmail.com</a>.
        </p>
      </div>

      {/* CTA */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground mb-4">Already have an invitation? Sign up below to claim your Founding Seller badge.</p>
        <Button className="bg-olive hover:bg-olive-light text-cream" size="lg" asChild>
          <Link href="/signup?founding=true">Sign up as a Founding Seller</Link>
        </Button>
      </div>
    </div>
  );
}
