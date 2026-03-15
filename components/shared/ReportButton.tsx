"use client";

import Link from "next/link";
import { Bug } from "lucide-react";

export function ReportButton() {
  return (
    <Link
      href="/contact?type=report"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-1.5 rounded-full bg-white border border-border shadow-md px-3 py-2 text-xs text-muted-foreground hover:text-navy hover:shadow-lg transition-all"
      aria-label="Report a problem"
    >
      <Bug className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Report a problem</span>
    </Link>
  );
}
