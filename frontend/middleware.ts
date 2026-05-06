import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/", "/login", "/register"];
const PROTECTED_PREFIXES = ["/dashboard", "/reports", "/jobs", "/applicants", "/screenings", "/analytics", "/profile", "/notifications", "/settings"];

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  /* Never gate Next internals or static asset requests (avoids broken chunk loads / fake 500s). */
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname === "/favicon.ico" ||
    /\.(?:ico|png|jpg|jpeg|gif|svg|webp|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("umurava_token")?.value;
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (PUBLIC_ROUTES.includes(pathname) && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Exclude all of `/_next/*` (chunks, css, webpack-hmr, …) plus api and favicon.
     * Omitting `_next/webpack-hmr` caused some dev setups to run auth on chunk requests.
     */
    "/((?!api|_next/|favicon.ico).*)",
  ],
};
