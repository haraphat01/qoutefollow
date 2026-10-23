import { and, count, desc, eq, gt, ilike, isNotNull, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  activityLogs,
  adminActions,
  customers,
  organizationMembers,
  organizations,
  quotes,
  scheduledFollowUps,
  sessions,
  users,
} from "@/lib/db/schema";

const LIST_LIMIT = 200;

function searchPattern(search?: string) {
  const trimmed = search?.trim();
  return trimmed ? `%${trimmed.replace(/[%_\\]/g, "\\$&")}%` : null;
}

export async function getPlatformStats() {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const [[userStats], [workspaceStats], [quoteStats], [sendStats]] =
    await Promise.all([
      db
        .select({
          total: count(),
          banned: count(users.bannedAt),
          newThisMonth: sql<number>`count(*) filter (where ${gt(users.createdAt, since)})`.mapWith(Number),
        })
        .from(users),
      db
        .select({ total: count(), suspended: count(organizations.suspendedAt) })
        .from(organizations),
      db.select({ total: count() }).from(quotes),
      db
        .select({ sent: count() })
        .from(scheduledFollowUps)
        .where(
          and(
            eq(scheduledFollowUps.status, "sent"),
            gt(scheduledFollowUps.sentAt, since),
          ),
        ),
    ]);

  return {
    users: userStats.total,
    bannedUsers: userStats.banned,
    newUsers: userStats.newThisMonth,
    workspaces: workspaceStats.total,
    suspendedWorkspaces: workspaceStats.suspended,
    quotes: quoteStats.total,
    followUpsSent30d: sendStats.sent,
  };
}

export async function listAdminUsers(options: {
  search?: string;
  bannedOnly?: boolean;
}) {
  const pattern = searchPattern(options.search);
  const lastSeen = db
    .select({
      userId: sessions.userId,
      lastSeenAt: sql<Date>`max(${sessions.createdAt})`.as("last_seen_at"),
    })
    .from(sessions)
    .groupBy(sessions.userId)
    .as("last_seen");

  return db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      bannedAt: users.bannedAt,
      createdAt: users.createdAt,
      role: organizationMembers.role,
      workspaceId: organizations.id,
      workspaceName: organizations.name,
      lastSeenAt: lastSeen.lastSeenAt,
    })
    .from(users)
    .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .leftJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .leftJoin(lastSeen, eq(lastSeen.userId, users.id))
    .where(
      and(
        pattern
          ? or(
              ilike(users.email, pattern),
              ilike(users.name, pattern),
              ilike(organizations.name, pattern),
            )
          : undefined,
        options.bannedOnly ? isNotNull(users.bannedAt) : undefined,
      ),
    )
    .orderBy(desc(users.createdAt))
    .limit(LIST_LIMIT);
}

export async function listAdminWorkspaces(options: {
  search?: string;
  suspendedOnly?: boolean;
}) {
  const pattern = searchPattern(options.search);
  const memberCounts = db
    .select({
      organizationId: organizationMembers.organizationId,
      members: count().as("members"),
    })
    .from(organizationMembers)
    .groupBy(organizationMembers.organizationId)
    .as("member_counts");
  const quoteCounts = db
    .select({
      organizationId: quotes.organizationId,
      quotes: count().as("quotes"),
    })
    .from(quotes)
    .groupBy(quotes.organizationId)
    .as("quote_counts");

  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      trade: organizations.trade,
      subscriptionPlan: organizations.subscriptionPlan,
      subscriptionStatus: organizations.subscriptionStatus,
      suspendedAt: organizations.suspendedAt,
      createdAt: organizations.createdAt,
      members: sql<number>`coalesce(${memberCounts.members}, 0)`.mapWith(Number),
      quotes: sql<number>`coalesce(${quoteCounts.quotes}, 0)`.mapWith(Number),
    })
    .from(organizations)
    .leftJoin(memberCounts, eq(memberCounts.organizationId, organizations.id))
    .leftJoin(quoteCounts, eq(quoteCounts.organizationId, organizations.id))
    .where(
      and(
        pattern ? ilike(organizations.name, pattern) : undefined,
        options.suspendedOnly ? isNotNull(organizations.suspendedAt) : undefined,
      ),
    )
    .orderBy(desc(organizations.createdAt))
    .limit(LIST_LIMIT);
}

export async function getAdminUser(userId: string) {
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      emailVerifiedAt: users.emailVerifiedAt,
      bannedAt: users.bannedAt,
      banReason: users.banReason,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      role: organizationMembers.role,
      workspaceId: organizations.id,
      workspaceName: organizations.name,
      workspaceSuspendedAt: organizations.suspendedAt,
    })
    .from(users)
    .leftJoin(organizationMembers, eq(organizationMembers.userId, users.id))
    .leftJoin(
      organizations,
      eq(organizations.id, organizationMembers.organizationId),
    )
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) {
    return null;
  }

  const [userSessions, activity] = await Promise.all([
    db
      .select({
        id: sessions.id,
        createdAt: sessions.createdAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), gt(sessions.expiresAt, new Date())))
      .orderBy(desc(sessions.createdAt)),
    db
      .select({
        id: activityLogs.id,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        action: activityLogs.action,
        metadata: activityLogs.metadata,
        createdAt: activityLogs.createdAt,
      })
      .from(activityLogs)
      .where(eq(activityLogs.userId, userId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(100),
  ]);

  return { user, sessions: userSessions, activity };
}

export async function getAdminWorkspace(organizationId: string) {
  const [workspace] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);

  if (!workspace) {
    return null;
  }

  const pendingFollowUps = db
    .select({
      quoteId: scheduledFollowUps.quoteId,
      pending: count().as("pending"),
    })
    .from(scheduledFollowUps)
    .where(eq(scheduledFollowUps.status, "scheduled"))
    .groupBy(scheduledFollowUps.quoteId)
    .as("pending_follow_ups");

  const [members, workspaceQuotes, activity, [customerStats]] =
    await Promise.all([
      db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: organizationMembers.role,
          bannedAt: users.bannedAt,
          emailVerifiedAt: users.emailVerifiedAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId))
        .where(eq(organizationMembers.organizationId, organizationId))
        .orderBy(organizationMembers.createdAt),
      db
        .select({
          id: quotes.id,
          quoteNumber: quotes.quoteNumber,
          amount: quotes.amount,
          status: quotes.status,
          followUpsEnabled: quotes.followUpsEnabled,
          createdAt: quotes.createdAt,
          customerName: customers.name,
          customerEmail: customers.email,
          pendingFollowUps: sql<number>`coalesce(${pendingFollowUps.pending}, 0)`.mapWith(Number),
        })
        .from(quotes)
        .innerJoin(customers, eq(customers.id, quotes.customerId))
        .leftJoin(pendingFollowUps, eq(pendingFollowUps.quoteId, quotes.id))
        .where(eq(quotes.organizationId, organizationId))
        .orderBy(desc(quotes.createdAt))
        .limit(LIST_LIMIT),
      db
        .select({
          id: activityLogs.id,
          entityType: activityLogs.entityType,
          action: activityLogs.action,
          metadata: activityLogs.metadata,
          createdAt: activityLogs.createdAt,
          userName: users.name,
        })
        .from(activityLogs)
        .leftJoin(users, eq(users.id, activityLogs.userId))
        .where(eq(activityLogs.organizationId, organizationId))
        .orderBy(desc(activityLogs.createdAt))
        .limit(100),
      db
        .select({ total: count() })
        .from(customers)
        .where(eq(customers.organizationId, organizationId)),
    ]);

  return {
    workspace,
    members,
    quotes: workspaceQuotes,
    activity,
    customerCount: customerStats.total,
  };
}

export async function listAdminActions(limit = 50) {
  return db
    .select()
    .from(adminActions)
    .orderBy(desc(adminActions.createdAt))
    .limit(limit);
}
