import { and, eq, gte, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  quotes,
  scheduledFollowUps,
} from "@/lib/db/schema";

export async function getOrganizationReport(
  organizationId: string,
  days = 30,
) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const statusRows = await db
    .select({
      status: quotes.status,
      count: sql<number>`count(*)::int`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        gte(quotes.createdAt, since),
      ),
    )
    .groupBy(quotes.status);

  const [revenue] = await db
    .select({
      total: sql<string>`coalesce(sum(${quotes.amount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.status, "accepted"),
        gte(quotes.updatedAt, since),
      ),
    );

  const followUpStats = await db
    .select({
      status: scheduledFollowUps.status,
      count: sql<number>`count(*)::int`,
    })
    .from(scheduledFollowUps)
    .where(
      and(
        eq(scheduledFollowUps.organizationId, organizationId),
        gte(scheduledFollowUps.createdAt, since),
      ),
    )
    .groupBy(scheduledFollowUps.status);

  const [outcomes] = await db
    .select({
      accepted: sql<number>`count(*) filter (where ${quotes.status} = 'accepted')::int`,
      declined: sql<number>`count(*) filter (where ${quotes.status} = 'declined')::int`,
      pending: sql<number>`count(*) filter (where ${quotes.status} in ('pending', 'draft', 'paused'))::int`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        gte(quotes.createdAt, since),
      ),
    );

  const decided = (outcomes?.accepted ?? 0) + (outcomes?.declined ?? 0);
  const winRate = decided > 0 ? (outcomes?.accepted ?? 0) / decided : 0;

  const statusMap = Object.fromEntries(
    statusRows.map((row) => [row.status, row.count]),
  );

  const followUpMap = Object.fromEntries(
    followUpStats.map((row) => [row.status, row.count]),
  );

  const [openPipeline] = await db
    .select({
      value: sql<string>`coalesce(sum(${quotes.amount}), 0)`,
      count: sql<number>`count(*)::int`,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        inArray(quotes.status, ["draft", "pending", "paused"]),
      ),
    );

  return {
    periodDays: days,
    since,
    quotesByStatus: statusMap,
    acceptedRevenue: revenue?.total ?? "0",
    acceptedCount: revenue?.count ?? 0,
    followUpsByStatus: followUpMap,
    outcomes: outcomes ?? { accepted: 0, declined: 0, pending: 0 },
    winRate,
    openPipelineValue: openPipeline?.value ?? "0",
    openPipelineCount: openPipeline?.count ?? 0,
    emailsSent: followUpMap.sent ?? 0,
    emailsFailed: followUpMap.failed ?? 0,
  };
}
