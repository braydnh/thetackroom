import Link from "next/link";
import { Logo } from "@/components/shared/Logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#2C3726" }}>
      {/* Header */}
      <div className="flex justify-center pt-10 pb-6">
        <Logo variant="full" theme="dark" />
      </div>

      {/* Content */}
      <div className="flex flex-1 items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>

      {/* Footer */}
      <div className="text-center pb-8">
        <p className="text-xs text-cream/30">
          &copy; {new Date().getFullYear()} The Tack Room &bull;{" "}
          <Link href="/privacy" className="hover:text-cream/60 transition-colors">
            Privacy
          </Link>{" "}
          &bull;{" "}
          <Link href="/terms" className="hover:text-cream/60 transition-colors">
            Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
