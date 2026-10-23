import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  conversations,
  quotes,
  scheduledFollowUps,
} from "@/lib/db/schema";

function median(values: number[]) {
  if (values.length === 0) {
    return null;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

export async function getOrganizationIntelligence(organizationId: string) {
  const since = new Date();
  since.setDate(since.getDate() - 90);

  const orgQuotes = await db
    .select({ id: quotes.id, status: quotes.status })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        gte(quotes.createdAt, since),
      ),
    );

  const quoteIds = orgQuotes.map((q) => q.id);
  const replyHours: number[] = [];

  if (quoteIds.length > 0) {
    const messages = await db
      .select({
        quoteId: conversations.quoteId,
        direction: conversations.direction,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.organizationId, organizationId),
          inArray(conversations.quoteId, quoteIds),
        ),
      )
      .orderBy(asc(conversations.createdAt));

    const byQuote = new Map<string, { outbound?: Date; inbound?: Date }>();
    for (const message of messages) {
      const entry = byQuote.get(message.quoteId) ?? {};
      if (message.direction === "outbound" && !entry.outbound) {
        entry.outbound = message.createdAt;
      }
      if (message.direction === "inbound" && entry.outbound && !entry.inbound) {
        entry.inbound = message.createdAt;
      }
      byQuote.set(message.quoteId, entry);
    }

    for (const entry of byQuote.values()) {
      if (entry.outbound && entry.inbound) {
        const hours =
          (entry.inbound.getTime() - entry.outbound.getTime()) / 3_600_000;
        if (hours >= 0 && hours < 24 * 30) {
          replyHours.push(hours);
        }
      }
    }
  }

  const medianReplyHours = median(replyHours);

  const acceptedQuotes = orgQuotes.filter((q) => q.status === "accepted");
  let acceptedWithTwoPlus = 0;
  const acceptedTotal = acceptedQuotes.length;

  for (const quote of acceptedQuotes) {
    const [counts] = await db
      .select({
        sent: sql<number>`count(*) filter (where ${scheduledFollowUps.status} = 'sent')::int`,
      })
      .from(scheduledFollowUps)
      .where(eq(scheduledFollowUps.quoteId, quote.id));
    if ((counts?.sent ?? 0) >= 2) {
      acceptedWithTwoPlus += 1;
    }
  }

  const acceptedAfterSecondFollowUpRate =
    acceptedTotal > 0 ? acceptedWithTwoPlus / acceptedTotal : null;

  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - 7);

  const [stale] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        inArray(quotes.status, ["pending", "paused"]),
        isNotNull(quotes.approvedAt),
        lte(quotes.approvedAt, staleBefore),
      ),
    );

  const classificationRows = await db
    .select({
      classification: conversations.replyClassification,
      count: sql<number>`count(*)::int`,
    })
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.direction, "inbound"),
        gte(conversations.createdAt, since),
        sql`${conversations.replyClassification} is not null`,
      ),
    )
    .groupBy(conversations.replyClassification);

  const replyClassifications = Object.fromEntries(
    classificationRows.map((row) => [
      row.classification ?? "unknown",
      row.count,
    ]),
  );

  return {
    medianReplyHours,
    acceptedAfterSecondFollowUpRate,
    acceptedWithTwoPlusFollowUps: acceptedWithTwoPlus,
    acceptedTotal,
    staleOpenQuotes: stale?.count ?? 0,
    replyClassifications,
    sampleReplyCount: replyHours.length,
  };
}

export async function getLatestInboundInsight(
  organizationId: string,
  quoteId: string,
) {
  const [row] = await db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.quoteId, quoteId),
        eq(conversations.direction, "inbound"),
      ),
    )
    .orderBy(desc(conversations.createdAt))
    .limit(1);

  return row ?? null;
}
