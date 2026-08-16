import { NextResponse, type NextRequest } from "next/server";

const ADMIN_SESSION_COOKIE = "attendance_admin_session";

/**
 * Edge-safe first pass only: redirects obviously-unauthenticated requests away
 * from /admin before they reach a server component. This is NOT the source of
 * truth — Prisma can't run on the Edge runtime, so every admin page/action
 * still calls requireUser()/requirePermission() server-side (lib/auth/guard.ts),
 * which is what actually enforces auth and RBAC.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
    const hasSession = request.cookies.has(ADMIN_SESSION_COOKIE);
    if (!hasSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  const response = NextResponse.next();
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(self), geolocation=(), microphone=()");
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/:path*", "/attendance/:path*"],
};
