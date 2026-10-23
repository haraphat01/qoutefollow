"use server";

import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import Stripe from "stripe";

import { isAdminEmail, requireAdmin } from "@/lib/auth/admin";
import { markEmailVerified } from "@/lib/auth/account-flows";
import { destroyAllSessionsForUser, type AppSession } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import {
  adminActions,
  organizationMembers,
  organizations,
  quoteDocuments,
  quotes,
  scheduledFollowUps,
  sessions,
  users,
} from "@/lib/db/schema";
import { cancelScheduledFollowUpsForQuote } from "@/lib/follow-ups/schedule";
import { deleteOrganizationUploads } from "@/lib/storage/uploads";

export type AdminActionResult = { error?: string; success?: boolean };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function adminOrNull() {
  return requireAdmin().catch(() => null);
}

async function logAdminAction(
  admin: AppSession,
  entry: {
    action: string;
    targetType: "user" | "workspace" | "quote";
    targetId: string | null;
    targetLabel: string;
    details?: string | null;
  },
) {
  await db.insert(adminActions).values({
    adminUserId: admin.user.id,
    adminEmail: admin.user.email,
    ...entry,
    details: entry.details ?? null,
  });
}

function refresh() {
  revalidatePath("/admin", "layout");
}

async function findUser(userId: string) {
  if (!UUID_PATTERN.test(userId)) {
    return null;
  }
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      bannedAt: users.bannedAt,
      role: organizationMembers.role,
      organizationId: organizationMembers.organizationId,
    })
    .from(users)
    .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .where(eq(users.id, userId))
    .limit(1);
  return row ?? null;
}

async function findWorkspace(organizationId: string) {
  if (!UUID_PATTERN.test(organizationId)) {
    return null;
  }
  const [row] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  return row ?? null;
}

/** Admins can't lock themselves (or another admin) out from here. */
function protectedUserError(
  admin: AppSession,
  user: { id: string; email: string },
) {
  if (user.id === admin.user.id) {
    return "You can't do this to your own account.";
  }
  if (isAdminEmail(user.email)) {
    return "This user is an admin. Remove them from ADMIN_EMAILS first.";
  }
  return null;
}

async function workspaceHasAdmin(organizationId: string) {
  const members = await db
    .select({ email: users.email })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(eq(organizationMembers.organizationId, organizationId));
  return members.some((member) => isAdminEmail(member.email));
}

async function cancelStripeSubscription(subscriptionId: string | null) {
  if (!subscriptionId || !process.env.STRIPE_SECRET_KEY) {
    return;
  }
  try {
    await getStripe().subscriptions.cancel(subscriptionId);
  } catch (error) {
    // Already cancelled or deleted in Stripe: nothing left to bill.
    if (
      error instanceof Stripe.errors.StripeInvalidRequestError &&
      error.code === "resource_missing"
    ) {
      return;
    }
    throw error;
  }
}

/**
 * Delete a workspace with all of its data and member logins. Accounts belong
 * to a single workspace, so members would otherwise be left unable to sign in
 * or sign up again with the same email.
 */
async function deleteWorkspaceAndMembers(
  workspace: typeof organizations.$inferSelect,
) {
  await cancelStripeSubscription(workspace.stripeSubscriptionId);

  const documents = await db
    .select({ storagePath: quoteDocuments.storagePath })
    .from(quoteDocuments)
    .where(eq(quoteDocuments.organizationId, workspace.id));
  const memberIds = (
    await db
      .select({ userId: organizationMembers.userId })
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, workspace.id))
  ).map((member) => member.userId);

  await db.transaction(async (tx) => {
    if (memberIds.length > 0) {
      await tx.delete(users).where(inArray(users.id, memberIds));
    }
    await tx.delete(organizations).where(eq(organizations.id, workspace.id));
  });

  try {
    await deleteOrganizationUploads(
      workspace.id,
      documents.map((document) => document.storagePath),
    );
  } catch {
    // The data is gone; leftover files are unreachable without their rows.
  }

  return memberIds.length;
}

export async function banUserAction(
  userId: string,
  input: { reason: string; suspendWorkspace: boolean },
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const user = await findUser(userId);
  if (!user) {
    return { error: "User not found." };
  }
  const blocked = protectedUserError(admin, user);
  if (blocked) {
    return { error: blocked };
  }

  const reason = input.reason.trim().slice(0, 500) || null;
  await db
    .update(users)
    .set({ bannedAt: new Date(), banReason: reason, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await destroyAllSessionsForUser(user.id);

  let suspended = false;
  if (
    input.suspendWorkspace &&
    user.role === "owner" &&
    user.organizationId &&
    !(await workspaceHasAdmin(user.organizationId))
  ) {
    await db
      .update(organizations)
      .set({ suspendedAt: new Date(), updatedAt: new Date() })
      .where(eq(organizations.id, user.organizationId));
    await db
      .delete(sessions)
      .where(eq(sessions.organizationId, user.organizationId));
    suspended = true;
  }

  await logAdminAction(admin, {
    action: "user.banned",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
    details: [reason, suspended ? "workspace suspended" : null]
      .filter(Boolean)
      .join(" · ") || null,
  });
  refresh();
  return { success: true };
}

export async function unbanUserAction(
  userId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const user = await findUser(userId);
  if (!user) {
    return { error: "User not found." };
  }

  await db
    .update(users)
    .set({ bannedAt: null, banReason: null, updatedAt: new Date() })
    .where(eq(users.id, user.id));
  await logAdminAction(admin, {
    action: "user.unbanned",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
  });
  refresh();
  return { success: true };
}

export async function revokeUserSessionsAction(
  userId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const user = await findUser(userId);
  if (!user) {
    return { error: "User not found." };
  }
  if (user.id === admin.user.id) {
    return { error: "Use Sign out to end your own session." };
  }

  await destroyAllSessionsForUser(user.id);
  await logAdminAction(admin, {
    action: "user.sessions_revoked",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
  });
  refresh();
  return { success: true };
}

export async function verifyUserEmailAction(
  userId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const user = await findUser(userId);
  if (!user) {
    return { error: "User not found." };
  }

  await markEmailVerified(user.id);
  await logAdminAction(admin, {
    action: "user.email_verified",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
  });
  refresh();
  return { success: true };
}

export async function deleteUserAction(
  userId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const user = await findUser(userId);
  if (!user) {
    return { error: "User not found." };
  }
  const blocked = protectedUserError(admin, user);
  if (blocked) {
    return { error: blocked };
  }

  let details: string | null = null;
  if (user.role === "owner" && user.organizationId) {
    const others = await db
      .select({ userId: organizationMembers.userId, role: organizationMembers.role })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, user.organizationId),
          ne(organizationMembers.userId, user.id),
        ),
      )
      .orderBy(asc(organizationMembers.createdAt));

    if (others.length === 0) {
      // Sole member: the workspace goes with them.
      const workspace = await findWorkspace(user.organizationId);
      if (workspace) {
        try {
          await deleteWorkspaceAndMembers(workspace);
        } catch {
          return {
            error: "Couldn't cancel their Stripe subscription. Cancel it in Stripe, then try again.",
          };
        }
        details = `workspace "${workspace.name}" deleted`;
      }
    } else if (!others.some((member) => member.role === "owner")) {
      // Keep the workspace usable by handing it to the longest-standing member.
      await db
        .update(organizationMembers)
        .set({ role: "owner" })
        .where(
          and(
            eq(organizationMembers.organizationId, user.organizationId),
            eq(organizationMembers.userId, others[0].userId),
          ),
        );
      details = "ownership passed to the next teammate";
    }
  }

  await db.delete(users).where(eq(users.id, user.id));
  await logAdminAction(admin, {
    action: "user.deleted",
    targetType: "user",
    targetId: user.id,
    targetLabel: user.email,
    details,
  });
  refresh();
  return { success: true };
}

export async function suspendWorkspaceAction(
  organizationId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const workspace = await findWorkspace(organizationId);
  if (!workspace) {
    return { error: "Workspace not found." };
  }
  if (await workspaceHasAdmin(workspace.id)) {
    return { error: "This workspace has an admin in it and can't be suspended." };
  }

  await db
    .update(organizations)
    .set({ suspendedAt: new Date(), updatedAt: new Date() })
    .where(eq(organizations.id, workspace.id));
  await db.delete(sessions).where(eq(sessions.organizationId, workspace.id));
  await logAdminAction(admin, {
    action: "workspace.suspended",
    targetType: "workspace",
    targetId: workspace.id,
    targetLabel: workspace.name,
  });
  refresh();
  return { success: true };
}

export async function unsuspendWorkspaceAction(
  organizationId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const workspace = await findWorkspace(organizationId);
  if (!workspace) {
    return { error: "Workspace not found." };
  }

  await db
    .update(organizations)
    .set({ suspendedAt: null, updatedAt: new Date() })
    .where(eq(organizations.id, workspace.id));
  await logAdminAction(admin, {
    action: "workspace.unsuspended",
    targetType: "workspace",
    targetId: workspace.id,
    targetLabel: workspace.name,
  });
  refresh();
  return { success: true };
}

export async function deleteWorkspaceAction(
  organizationId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const workspace = await findWorkspace(organizationId);
  if (!workspace) {
    return { error: "Workspace not found." };
  }
  if (await workspaceHasAdmin(workspace.id)) {
    return { error: "This workspace has an admin in it and can't be deleted here." };
  }

  let deletedMembers: number;
  try {
    deletedMembers = await deleteWorkspaceAndMembers(workspace);
  } catch {
    return {
      error: "Couldn't cancel the Stripe subscription. Cancel it in Stripe, then try again.",
    };
  }
  await logAdminAction(admin, {
    action: "workspace.deleted",
    targetType: "workspace",
    targetId: workspace.id,
    targetLabel: workspace.name,
    details: `${deletedMembers} member account${deletedMembers === 1 ? "" : "s"} deleted`,
  });
  refresh();
  return { success: true };
}

export async function stopWorkspaceFollowUpsAction(
  organizationId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const workspace = await findWorkspace(organizationId);
  if (!workspace) {
    return { error: "Workspace not found." };
  }

  await db
    .update(quotes)
    .set({ followUpsEnabled: false, updatedAt: new Date() })
    .where(eq(quotes.organizationId, workspace.id));
  const cancelled = await db
    .update(scheduledFollowUps)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(scheduledFollowUps.organizationId, workspace.id),
        eq(scheduledFollowUps.status, "scheduled"),
      ),
    )
    .returning({ id: scheduledFollowUps.id });

  await logAdminAction(admin, {
    action: "workspace.follow_ups_stopped",
    targetType: "workspace",
    targetId: workspace.id,
    targetLabel: workspace.name,
    details: `${cancelled.length} scheduled follow-up${cancelled.length === 1 ? "" : "s"} cancelled`,
  });
  refresh();
  return { success: true };
}

async function findQuote(quoteId: string) {
  if (!UUID_PATTERN.test(quoteId)) {
    return null;
  }
  const [row] = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      workspaceName: organizations.name,
    })
    .from(quotes)
    .innerJoin(organizations, eq(organizations.id, quotes.organizationId))
    .where(eq(quotes.id, quoteId))
    .limit(1);
  return row ?? null;
}

export async function stopQuoteFollowUpsAction(
  quoteId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const quote = await findQuote(quoteId);
  if (!quote) {
    return { error: "Quote not found." };
  }

  await db
    .update(quotes)
    .set({ followUpsEnabled: false, updatedAt: new Date() })
    .where(eq(quotes.id, quote.id));
  await cancelScheduledFollowUpsForQuote(quote.id);
  await logAdminAction(admin, {
    action: "quote.follow_ups_stopped",
    targetType: "quote",
    targetId: quote.id,
    targetLabel: `${quote.quoteNumber} (${quote.workspaceName})`,
  });
  refresh();
  return { success: true };
}

export async function deleteQuoteAction(
  quoteId: string,
): Promise<AdminActionResult> {
  const admin = await adminOrNull();
  if (!admin) {
    return { error: "Admins only." };
  }
  const quote = await findQuote(quoteId);
  if (!quote) {
    return { error: "Quote not found." };
  }

  await db.delete(quotes).where(eq(quotes.id, quote.id));
  await logAdminAction(admin, {
    action: "quote.deleted",
    targetType: "quote",
    targetId: quote.id,
    targetLabel: `${quote.quoteNumber} (${quote.workspaceName})`,
  });
  refresh();
  return { success: true };
}
