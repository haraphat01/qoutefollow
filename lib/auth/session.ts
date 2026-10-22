import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  organizationMembers,
  organizations,
  sessions,
  users,
} from "@/lib/db/schema";

import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS } from "./constants";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
};

export type SessionOrganization = {
  id: string;
  name: string;
  trade: "roofing" | "hvac" | "plumbing" | "other";
  slug: string;
};

export type AppSession = {
  user: SessionUser;
  organization: SessionOrganization;
  role: "owner" | "member";
};

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await db.insert(sessions).values({
    userId,
    tokenHash,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (token) {
    await db
      .delete(sessions)
      .where(eq(sessions.tokenHash, hashToken(token)));
  }

  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<AppSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  const tokenHash = hashToken(token);
  const now = new Date();

  const [row] = await db
    .select({
      sessionId: sessions.id,
      expiresAt: sessions.expiresAt,
      userId: users.id,
      email: users.email,
      name: users.name,
      role: organizationMembers.role,
      organizationId: organizations.id,
      organizationName: organizations.name,
      organizationTrade: organizations.trade,
      organizationSlug: organizations.slug,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  if (!row || row.expiresAt < now) {
    if (row) {
      await db.delete(sessions).where(eq(sessions.id, row.sessionId));
    }
    cookieStore.delete(SESSION_COOKIE);
    return null;
  }

  return {
    user: {
      id: row.userId,
      email: row.email,
      name: row.name,
    },
    organization: {
      id: row.organizationId,
      name: row.organizationName,
      trade: row.organizationTrade,
      slug: row.organizationSlug,
    },
    role: row.role,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}
