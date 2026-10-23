import { asc, eq } from "drizzle-orm";

import { appUrl } from "@/lib/billing/stripe";
import { issueAuthToken } from "@/lib/auth/tokens";
import { db } from "@/lib/db";
import { organizationMembers, organizations, users } from "@/lib/db/schema";
import {
  buildPasswordResetEmail,
  buildTeamInviteEmail,
  buildVerificationEmail,
  buildWelcomeEmail,
  sendAccountEmail,
} from "@/lib/email/account-emails";

type EmailUser = { id: string; name: string; email: string };

export async function sendVerificationEmail(user: EmailUser) {
  const token = await issueAuthToken(user.id, "email_verification");
  await sendAccountEmail(
    user.email,
    buildVerificationEmail({
      name: user.name,
      url: appUrl(`/api/auth/verify?token=${token}`),
    }),
  );
}

export async function sendPasswordResetEmail(user: EmailUser) {
  const token = await issueAuthToken(user.id, "password_reset");
  await sendAccountEmail(
    user.email,
    buildPasswordResetEmail({
      name: user.name,
      url: appUrl(`/reset-password?token=${token}`),
    }),
  );
}

export async function sendTeamInviteEmail(
  user: EmailUser,
  inviter: { name: string; email: string },
  businessName: string,
) {
  const token = await issueAuthToken(user.id, "team_invite");
  await sendAccountEmail(
    user.email,
    buildTeamInviteEmail({
      name: user.name,
      inviterName: inviter.name,
      businessName,
      url: appUrl(`/reset-password?token=${token}&invite=1`),
    }),
    { replyTo: inviter.email },
  );
}

/** Welcome the owner of a new workspace once their email is confirmed. */
export async function sendWelcomeEmail(userId: string) {
  const [row] = await db
    .select({
      name: users.name,
      email: users.email,
      role: organizationMembers.role,
      businessName: organizations.name,
    })
    .from(users)
    .innerJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .innerJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(users.id, userId))
    .orderBy(asc(organizationMembers.createdAt))
    .limit(1);

  // Invited teammates join an existing workspace; the setup checklist is for owners.
  if (!row || row.role !== "owner") {
    return;
  }

  await sendAccountEmail(
    row.email,
    buildWelcomeEmail({ name: row.name, businessName: row.businessName }),
  );
}

export async function markEmailVerified(userId: string) {
  await db
    .update(users)
    .set({ emailVerifiedAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, userId));
}

/** Not a server action: only call after validating a verification token. */
export async function completeEmailVerification(userId: string) {
  await markEmailVerified(userId);
  try {
    await sendWelcomeEmail(userId);
  } catch {
    // The welcome email is a nicety; verification already succeeded.
  }
}
