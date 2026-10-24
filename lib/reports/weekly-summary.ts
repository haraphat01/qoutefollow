import { and, asc, desc, eq, gte, inArray, isNull, lt, or, sql } from "drizzle-orm";

import { appUrl } from "@/lib/billing/stripe";
import { db } from "@/lib/db";
import { conversations, customers, organizations, quotes, scheduledFollowUps } from "@/lib/db/schema";
import { accountEmailsEnabled, buildWeeklySummaryEmail, sendAccountEmail } from "@/lib/email/account-emails";
import { formatCurrency } from "@/lib/format";
import { listOrganizationMembers } from "@/lib/queries/members";

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getWeeklySummary(organizationId: string, now = new Date()) {
  const since = new Date(now.getTime() - 7 * DAY_MS);
  const sinceSql = sql`${since.toISOString()}::timestamptz`;

  const [[counts], [replies], [followUps], stale] = await Promise.all([
    db
      .select({
        created: sql<number>`count(*) filter (where ${quotes.createdAt} >= ${sinceSql})::int`,
        sent: sql<number>`count(*) filter (where ${quotes.sentAt} >= ${sinceSql})::int`,
        won: sql<number>`count(*) filter (where ${quotes.status} = 'accepted' and coalesce(${quotes.acceptedAt}, ${quotes.updatedAt}) >= ${sinceSql})::int`,
        wonValue: sql<string>`coalesce(sum(${quotes.amount}) filter (where ${quotes.status} = 'accepted' and coalesce(${quotes.acceptedAt}, ${quotes.updatedAt}) >= ${sinceSql}), 0)`,
        declined: sql<number>`count(*) filter (where ${quotes.status} = 'declined' and ${quotes.updatedAt} >= ${sinceSql})::int`,
        openCount: sql<number>`count(*) filter (where ${quotes.status} in ('draft', 'pending', 'paused'))::int`,
        openValue: sql<string>`coalesce(sum(${quotes.amount}) filter (where ${quotes.status} in ('draft', 'pending', 'paused')), 0)`,
      })
      .from(quotes)
      .where(eq(quotes.organizationId, organizationId)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(conversations)
      .where(and(eq(conversations.organizationId, organizationId), eq(conversations.direction, "inbound"), gte(conversations.createdAt, since))),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(scheduledFollowUps)
      .where(and(eq(scheduledFollowUps.organizationId, organizationId), eq(scheduledFollowUps.status, "sent"), gte(scheduledFollowUps.sentAt, since))),
    // Open a week or more with no customer reply: worth a phone call.
    db
      .select({ id: quotes.id, quoteNumber: quotes.quoteNumber, amount: quotes.amount, customerName: customers.name })
      .from(quotes)
      .innerJoin(customers, eq(customers.id, quotes.customerId))
      .where(
        and(
          eq(quotes.organizationId, organizationId),
          eq(quotes.status, "pending"),
          sql`coalesce(${quotes.sentAt}, ${quotes.createdAt}) < ${sinceSql}`,
          sql`not exists (select 1 from ${conversations} where ${conversations.quoteId} = ${quotes.id} and ${conversations.direction} = 'inbound')`,
        ),
      )
      .orderBy(desc(quotes.amount), asc(quotes.createdAt))
      .limit(5),
  ]);

  return {
    since,
    created: counts.created,
    sent: counts.sent,
    won: counts.won,
    wonValue: Number(counts.wonValue),
    declined: counts.declined,
    replies: replies.count,
    followUpsSent: followUps.count,
    openCount: counts.openCount,
    openValue: Number(counts.openValue),
    stale: stale.map((row) => ({ ...row, amount: Number(row.amount) })),
  };
}

/** Email the summary to a workspace's owners (or one address, for a preview). */
export async function sendWeeklySummary(organizationId: string, options: { to?: string } = {}) {
  const [organization] = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(eq(organizations.id, organizationId))
    .limit(1);
  if (!organization) {
    return 0;
  }
  const summary = await getWeeklySummary(organizationId);
  const email = buildWeeklySummaryEmail({
    businessName: organization.name,
    stats: [
      ["Quotes created", String(summary.created)],
      ["Quotes sent", String(summary.sent)],
      ["Won", `${summary.won} · ${formatCurrency(summary.wonValue)}`],
      ["Declined", String(summary.declined)],
      ["Customer replies", String(summary.replies)],
      ["Follow-ups sent", String(summary.followUpsSent)],
    ],
    pipeline: `${summary.openCount} open ${summary.openCount === 1 ? "quote" : "quotes"} worth ${formatCurrency(summary.openValue)}`,
    stale: summary.stale.map((row) => ({
      label: `${row.quoteNumber} · ${row.customerName} · ${formatCurrency(row.amount)}`,
      url: appUrl(`/quotes/${row.id}`),
    })),
    dashboardUrl: appUrl("/dashboard"),
    settingsUrl: appUrl("/settings/email"),
  });

  const recipients = options.to
    ? [options.to]
    : (await listOrganizationMembers(organizationId))
        .filter((member) => member.role === "owner" && member.emailVerifiedAt !== null)
        .map((member) => member.email);
  const results = await Promise.allSettled(recipients.map((to) => sendAccountEmail(to, email)));
  return results.filter((result) => result.status === "fulfilled").length;
}

function localTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "short", hour: "numeric", hour12: false }).formatToParts(now);
  return {
    weekday: parts.find((part) => part.type === "weekday")?.value,
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? 0) % 24,
  };
}

/**
 * Called on every follow-up worker run: sends each workspace's summary once a
 * week, on Monday from 8am in its own time zone.
 */
export async function sendDueWeeklySummaries(now = new Date()) {
  if (!accountEmailsEnabled()) {
    return 0;
  }
  const notSentRecently = or(
    isNull(organizations.lastWeeklySummaryAt),
    lt(organizations.lastWeeklySummaryAt, new Date(now.getTime() - 6 * DAY_MS)),
  );
  const candidates = await db
    .select({ id: organizations.id, sendTimezone: organizations.sendTimezone })
    .from(organizations)
    .where(and(eq(organizations.weeklySummaryEnabled, true), isNull(organizations.suspendedAt), notSentRecently));

  const due = candidates.filter((org) => {
    const local = localTime(now, org.sendTimezone);
    return local.weekday === "Mon" && local.hour >= 8;
  });
  if (due.length === 0) {
    return 0;
  }

  // Claim first so overlapping worker runs can't send twice.
  const claimed = await db
    .update(organizations)
    .set({ lastWeeklySummaryAt: now })
    .where(and(inArray(organizations.id, due.map((org) => org.id)), notSentRecently))
    .returning({ id: organizations.id });

  let sent = 0;
  for (const org of claimed) {
    try {
      sent += await sendWeeklySummary(org.id);
    } catch {
      // One workspace failing shouldn't stop the others.
    }
  }
  return sent;
}
