"use server";

import { randomBytes } from "crypto";
import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { sendTeamInviteEmail } from "@/lib/auth/account-flows";
import { requireSession } from "@/lib/auth/session";
import { issuedRecently } from "@/lib/auth/tokens";
import { accountEmailsEnabled } from "@/lib/email/account-emails";
import {
  assertEntitlement,
  getOrganizationEntitlements,
} from "@/lib/billing/organization";
import { db } from "@/lib/db";
import {
  activityLogs,
  authTokens,
  organizationMembers,
  sessions,
  users,
} from "@/lib/db/schema";
import {
  addTeamMemberSchema,
  changePasswordSchema,
} from "@/lib/validations/auth";

export async function addTeamMemberAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can add teammates." };
  }

  const billing = await getOrganizationEntitlements(session.organization.id);
  try {
    assertEntitlement(billing!.entitlements, "canUseTeamFeatures");
  } catch {
    return { error: "Adding teammates requires an active subscription or trial." };
  }

  const parsed = addTeamMemberSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // With email configured the teammate sets their own password from an
  // invite link; otherwise the owner hands over a temporary password.
  const inviteByEmail = accountEmailsEnabled();
  const tempPassword = String(formData.get("password") ?? "");
  if (!inviteByEmail && tempPassword.length < 8) {
    return { fieldErrors: { password: ["Use at least 8 characters"] } };
  }

  const email = parsed.data.email.toLowerCase();
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Accounts belong to a single workspace, so an existing login can't be shared.
  if (existing) {
    return {
      fieldErrors: { email: ["This email already has a QuoteFollow account."] },
    };
  }

  const [user] = await db
    .insert(users)
    .values({
      name: parsed.data.name,
      email,
      // Invitees get an unguessable placeholder until they choose a password.
      passwordHash: await hashPassword(
        inviteByEmail ? randomBytes(32).toString("hex") : tempPassword,
      ),
      emailVerifiedAt: inviteByEmail ? null : new Date(),
    })
    .returning({ id: users.id, name: users.name, email: users.email });

  await db.insert(organizationMembers).values({
    organizationId: session.organization.id,
    userId: user.id,
    role: "member",
  });

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "user",
    entityId: user.id,
    action: "member_added",
  });

  revalidatePath("/settings/team");

  if (inviteByEmail) {
    try {
      await sendTeamInviteEmail(user, session.user, session.organization.name);
    } catch {
      return {
        error: `${user.name} was added, but the invite email failed. Use “Resend invite”.`,
      };
    }
  }
  return { success: true };
}

export async function resendTeamInviteAction(
  userId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can send invites." };
  }

  const [member] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(
      and(
        eq(organizationMembers.organizationId, session.organization.id),
        eq(organizationMembers.userId, userId),
      ),
    )
    .limit(1);

  if (!member) {
    return { error: "Teammate not found." };
  }
  if (member.emailVerifiedAt) {
    return { error: `${member.name} has already joined.` };
  }
  if (await issuedRecently(member.id, "team_invite")) {
    return { error: "An invite was just sent. Wait a minute before resending." };
  }

  try {
    await sendTeamInviteEmail(member, session.user, session.organization.name);
  } catch {
    return { error: "We couldn't send the invite. Try again shortly." };
  }
  return { success: true };
}

export async function removeTeamMemberAction(
  userId: string,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }
  if (session.role !== "owner") {
    return { error: "Only the account owner can remove teammates." };
  }
  if (userId === session.user.id) {
    return { error: "You can't remove yourself." };
  }

  const [removed] = await db
    .delete(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, session.organization.id),
        eq(organizationMembers.userId, userId),
        ne(organizationMembers.role, "owner"),
      ),
    )
    .returning({ id: organizationMembers.id });

  if (!removed) {
    return { error: "Teammate not found." };
  }

  await db
    .delete(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        eq(sessions.organizationId, session.organization.id),
      ),
    );

  // An outstanding invite link must not let a removed teammate back in.
  await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.userId, userId), isNull(authTokens.usedAt)));

  await db.insert(activityLogs).values({
    organizationId: session.organization.id,
    userId: session.user.id,
    entityType: "user",
    entityId: userId,
    action: "member_removed",
  });

  revalidatePath("/settings/team");
  return {};
}

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const [user] = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user || !(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
    return { fieldErrors: { currentPassword: ["Current password is incorrect."] } };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.newPassword),
      updatedAt: new Date(),
    })
    .where(eq(users.id, session.user.id));

  return { success: true };
}
