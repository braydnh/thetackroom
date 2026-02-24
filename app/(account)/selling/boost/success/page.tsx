import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Zap, CheckCircle } from "lucide-react";

export default function BoostSuccessPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto mb-5 h-16 w-16 rounded-full bg-olive/10 flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-olive" />
      </div>
      <h1
        className="text-2xl font-bold text-navy mb-2"
        style={{ fontFamily: "var(--font-playfair), Georgia, serif" }}
      >
        Listing boosted!
      </h1>
      <p className="text-sm text-muted-foreground mb-8">
        Your listing is now featured. It may take a minute or two to appear.
      </p>
      <div className="flex flex-col gap-3">
        <Button className="bg-olive hover:bg-olive-light text-cream" asChild>
          <Link href="/listings">Browse listings</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/selling">My listings</Link>
        </Button>
      </div>
    </div>
  );
}
