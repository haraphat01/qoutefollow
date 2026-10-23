import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE, SESSION_TOKEN_PATTERN } from "@/lib/auth/constants";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/quotes",
  "/customers",
  "/settings",
  "/reports",
];
const AUTH_PATHS = ["/login", "/register", "/forgot-password"];

function hasValidSessionCookie(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return false;
  }
  return SESSION_TOKEN_PATTERN.test(token);
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = hasValidSessionCookie(request);

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix),
  );
  const isAuth = AUTH_PATHS.some((path) => pathname === path);

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    const response = NextResponse.redirect(loginUrl);
    if (sessionCookie) {
      response.cookies.delete(SESSION_COOKIE);
    }
    return response;
  }

  if (isAuth && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/quotes/:path*",
    "/customers/:path*",
    "/settings/:path*",
    "/reports",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
