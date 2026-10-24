import { and, count, eq, gt, lt, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { signInAttempts } from "@/lib/db/schema";

const WINDOW_MS = 15 * 60 * 1000;
/** Failed attempts allowed per email, then per network address, per window. */
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 30;

/**
 * The client's address as seen by the reverse proxy (Traefik on Coolify sets
 * X-Real-IP; the last X-Forwarded-For hop is the one it added).
 */
export function clientIp(headers: Headers) {
  const real = headers.get("x-real-ip")?.trim();
  if (real) {
    return real;
  }
  const forwarded = headers.get("x-forwarded-for")?.split(",").map((part) => part.trim()).filter(Boolean);
  return forwarded?.at(-1) ?? null;
}

/** Minutes until another attempt is allowed, or 0 if sign-in may proceed. */
export async function signInBlockedFor(email: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const failuresWhere = (column: typeof signInAttempts.email | typeof signInAttempts.ip, value: string) =>
    db
      .select({ total: count() })
      .from(signInAttempts)
      .where(and(eq(column, value), gt(signInAttempts.createdAt, since)))
      .then((rows) => rows[0]);
  const [byEmail, byIp] = await Promise.all([
    failuresWhere(signInAttempts.email, email),
    ip ? failuresWhere(signInAttempts.ip, ip) : Promise.resolve({ total: 0 }),
  ]);

  if (byEmail.total < MAX_FAILURES_PER_EMAIL && byIp.total < MAX_FAILURES_PER_IP) {
    return 0;
  }

  // Locked until the oldest failure in the window ages out.
  const [oldest] = await db
    .select({ createdAt: signInAttempts.createdAt })
    .from(signInAttempts)
    .where(
      and(
        gt(signInAttempts.createdAt, since),
        byEmail.total >= MAX_FAILURES_PER_EMAIL || !ip ? eq(signInAttempts.email, email) : eq(signInAttempts.ip, ip),
      ),
    )
    .orderBy(signInAttempts.createdAt)
    .limit(1);
  const unlockAt = (oldest?.createdAt.getTime() ?? Date.now()) + WINDOW_MS;
  return Math.max(1, Math.ceil((unlockAt - Date.now()) / 60_000));
}

export async function recordFailedSignIn(email: string, ip: string | null) {
  await db.insert(signInAttempts).values({ email, ip });
  // Keep the table small: nothing older than a day matters.
  await db
    .delete(signInAttempts)
    .where(
      and(
        or(eq(signInAttempts.email, email), ip ? eq(signInAttempts.ip, ip) : undefined),
        lt(signInAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)),
      ),
    );
}

export async function clearFailedSignIns(email: string) {
  await db.delete(signInAttempts).where(eq(signInAttempts.email, email));
}
