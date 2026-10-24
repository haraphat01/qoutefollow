import { SESSION_COOKIE } from "@/lib/auth/constants";
import { getSession } from "@/lib/auth/session";
import { redirectToPath } from "@/lib/http";

/**
 * Drops a cookie whose session no longer exists (expired, banned or deleted)
 * and sends the visitor to sign in. A valid session is left untouched, so
 * this can't be used to sign someone out.
 */
export async function GET() {
  if (await getSession()) {
    return redirectToPath("/dashboard");
  }
  const response = redirectToPath("/login");
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
