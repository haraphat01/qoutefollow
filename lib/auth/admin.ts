import { getSession } from "@/lib/auth/session";

/** Platform admins are listed in ADMIN_EMAILS (comma-separated). */
export function isAdminEmail(email: string) {
  const admins = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.toLowerCase());
}

/** The signed-in, verified admin's session, or null for everyone else. */
export async function getAdminSession() {
  const session = await getSession();
  if (!session || !session.user.emailVerified) {
    return null;
  }
  return isAdminEmail(session.user.email) ? session : null;
}

/** For admin server actions. */
export async function requireAdmin() {
  const session = await getAdminSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
