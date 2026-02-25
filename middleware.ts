import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BYPASS_COOKIE = "tr_preview";

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  // Skip static files, Next.js internals, and the maintenance page itself
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/maintenance") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml"
  ) {
    return NextResponse.next();
  }

  const maintenanceMode = process.env.MAINTENANCE_MODE === "1";
  if (!maintenanceMode) return NextResponse.next();

  const bypassKey = process.env.MAINTENANCE_KEY;

  // Set bypass cookie if the correct key is provided in the URL
  if (bypassKey && searchParams.get("preview") === bypassKey) {
    const url = request.nextUrl.clone();
    url.searchParams.delete("preview");
    const res = NextResponse.redirect(url);
    res.cookies.set(BYPASS_COOKIE, bypassKey, {
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: "/",
    });
    return res;
  }

  // Allow through if bypass cookie is valid
  const cookie = request.cookies.get(BYPASS_COOKIE);
  if (bypassKey && cookie?.value === bypassKey) {
    return NextResponse.next();
  }

  // Redirect everyone else to the maintenance page
  const url = request.nextUrl.clone();
  url.pathname = "/maintenance";
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
