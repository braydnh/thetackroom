import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/dashboard", "/selling", "/orders", "/messages", "/settings", "/favourites", "/checkout"];
const ADMIN_PATHS = ["/admin"];
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];

const BYPASS_COOKIE = "tr_preview";

// Paths that are always accessible even in maintenance mode
const MAINTENANCE_BYPASS_PATHS = [
  "/maintenance",
  "/auth/confirm",   // email confirmation links must always work
  "/auth/callback",
  "/callback",
  "/api/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

export async function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // ── Maintenance mode ──────────────────────────────────────────────────────
  // Logged-in users always get through. Everyone else sees the coming soon page
  // unless they have the bypass cookie or preview key.
  const maintenanceMode = process.env.MAINTENANCE_MODE === "1";
  if (maintenanceMode && !user && !MAINTENANCE_BYPASS_PATHS.some((p) => pathname.startsWith(p))) {
    const bypassKey = process.env.MAINTENANCE_KEY;

    // Set bypass cookie when correct key is supplied as ?preview=KEY
    if (bypassKey && searchParams.get("preview") === bypassKey) {
      const url = request.nextUrl.clone();
      url.searchParams.delete("preview");
      const res = NextResponse.redirect(url);
      res.cookies.set(BYPASS_COOKIE, bypassKey, {
        httpOnly: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 30,
        path: "/",
      });
      return res;
    }

    // Allow through if valid bypass cookie present
    const cookie = request.cookies.get(BYPASS_COOKIE);
    if (!bypassKey || cookie?.value !== bypassKey) {
      const url = request.nextUrl.clone();
      url.pathname = "/maintenance";
      return NextResponse.rewrite(url);
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  // Redirect unauthenticated users away from protected routes
  const isProtected = PROTECTED_PATHS.some((p) => pathname.startsWith(p));
  const isAdmin = ADMIN_PATHS.some((p) => pathname.startsWith(p));

  if ((isProtected || isAdmin) && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from auth pages
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p));
  if (isAuth && user) {
    const url = request.nextUrl.clone();
    url.pathname = "/selling";
    return NextResponse.redirect(url);
  }

  // Admin route guard — check role from profile
  if (isAdmin && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/selling";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
