import { createHash, randomBytes } from "crypto";
import { and, eq, gt, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { authTokens, type authTokenTypeEnum } from "@/lib/db/schema";

export type AuthTokenType = (typeof authTokenTypeEnum.enumValues)[number];

export const AUTH_TOKEN_TTL_MS: Record<AuthTokenType, number> = {
  email_verification: 24 * 60 * 60 * 1000,
  password_reset: 60 * 60 * 1000,
  team_invite: 7 * 24 * 60 * 60 * 1000,
};

/** Minimum gap between emailed links of one type, to stop inbox flooding. */
export const AUTH_TOKEN_RESEND_COOLDOWN_MS = 60 * 1000;

export function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

/** Issue a new link token, invalidating earlier unused ones of the same type. */
export async function issueAuthToken(userId: string, type: AuthTokenType) {
  const now = new Date();
  await db
    .update(authTokens)
    .set({ usedAt: now })
    .where(
      and(
        eq(authTokens.userId, userId),
        eq(authTokens.type, type),
        isNull(authTokens.usedAt),
      ),
    );

  const token = randomBytes(32).toString("hex");
  await db.insert(authTokens).values({
    userId,
    type,
    tokenHash: hashAuthToken(token),
    expiresAt: new Date(now.getTime() + AUTH_TOKEN_TTL_MS[type]),
  });
  return token;
}

/** True when a link of this type was issued too recently to send another. */
export async function issuedRecently(userId: string, type: AuthTokenType) {
  const [row] = await db
    .select({ id: authTokens.id })
    .from(authTokens)
    .where(
      and(
        eq(authTokens.userId, userId),
        eq(authTokens.type, type),
        gt(
          authTokens.createdAt,
          new Date(Date.now() - AUTH_TOKEN_RESEND_COOLDOWN_MS),
        ),
      ),
    )
    .limit(1);
  return Boolean(row);
}

/** Look up a valid (unused, unexpired) token without consuming it. */
export async function findAuthToken(token: string, types: AuthTokenType[]) {
  if (!/^[a-f0-9]{64}$/i.test(token)) {
    return null;
  }
  const [row] = await db
    .select()
    .from(authTokens)
    .where(
      and(
        eq(authTokens.tokenHash, hashAuthToken(token)),
        isNull(authTokens.usedAt),
        gt(authTokens.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return row && types.includes(row.type) ? row : null;
}

/** Mark a token used. Returns false if another request already consumed it. */
export async function consumeAuthToken(id: string) {
  const [row] = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, id), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  return Boolean(row);
}
