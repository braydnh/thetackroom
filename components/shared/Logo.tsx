import Link from "next/link";
import { cn } from "@/lib/utils";

interface LogoProps {
  variant?: "full" | "monogram";
  /** "light" = dark olive logo (default), "dark" = cream logo for olive backgrounds */
  theme?: "light" | "dark";
  className?: string;
  href?: string;
}

export function Logo({ variant = "full", theme = "light", className, href = "/" }: LogoProps) {
  const src = theme === "dark" ? "/New_dark_v2.png" : "/New_light.png";

  // Crop vertical whitespace by clipping the height, but allow full natural width
  const containerH = variant === "monogram" ? 40 : 96;
  const imageH     = variant === "monogram" ? 65 : 180;

  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-olive rounded",
        className
      )}
    >
      <div
        style={{ height: containerH, overflow: "hidden", display: "flex", alignItems: "center" }}
      >
        <img
          src={src}
          alt="The Tack Room"
          style={{ height: imageH, width: "auto" }}
        />
      </div>
    </Link>
  );
}
