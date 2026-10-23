import { and, eq, inArray, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotes, scheduledFollowUps } from "@/lib/db/schema";

const OPEN_STATUSES = ["draft", "pending", "paused"] as const;

export async function getDashboardStats(organizationId: string) {
  const [openQuotes] = await db
    .select({
      count: sql<number>`count(*)::int`,
      total: sql<string>`coalesce(sum(${quotes.amount}), 0)`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        inArray(quotes.status, [...OPEN_STATUSES]),
      ),
    );

  const [accepted] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.status, "accepted"),
      ),
    );

  const now = new Date();
  const [dueFollowUps] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(scheduledFollowUps)
    .where(
      and(
        eq(scheduledFollowUps.organizationId, organizationId),
        eq(scheduledFollowUps.status, "scheduled"),
        lte(scheduledFollowUps.scheduledFor, now),
      ),
    );

  const upcoming = await db
    .select({
      id: scheduledFollowUps.id,
      quoteId: quotes.id,
      scheduledFor: scheduledFollowUps.scheduledFor,
      quoteNumber: quotes.quoteNumber,
      amount: quotes.amount,
      status: quotes.status,
    })
    .from(scheduledFollowUps)
    .innerJoin(quotes, eq(scheduledFollowUps.quoteId, quotes.id))
    .where(
      and(
        eq(scheduledFollowUps.organizationId, organizationId),
        eq(scheduledFollowUps.status, "scheduled"),
      ),
    )
    .orderBy(scheduledFollowUps.scheduledFor)
    .limit(6);

  return {
    pendingQuotes: openQuotes?.count ?? 0,
    openPipelineValue: openQuotes?.total ?? "0",
    acceptedQuotes: accepted?.count ?? 0,
    followUpsDue: dueFollowUps?.count ?? 0,
    upcomingFollowUps: upcoming,
  };
}
