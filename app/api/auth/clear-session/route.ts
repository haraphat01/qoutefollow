import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";

/**
 * Drops a cookie whose session no longer exists (expired, banned or deleted)
 * and sends the visitor to sign in. A valid session is left untouched, so
 * this can't be used to sign someone out.
 */
export async function GET(request: Request) {
  if (await getSession()) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
