import { and, eq, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { activityLogs, notifications, quotes } from "@/lib/db/schema";

/** Opens of the same quote this close together are one visit (reloads, re-renders). */
const VISIT_GAP_MS = 2 * 60 * 1000;

/**
 * Count a customer opening their online quote. The first view notifies the
 * team; it's a strong signal to call while the quote is on their mind.
 */
export async function trackQuoteView(quote: { id: string; organizationId: string; quoteNumber: string }) {
  const now = new Date();
  const [row] = await db
    .update(quotes)
    .set({
      viewCount: sql`${quotes.viewCount} + 1`,
      lastViewedAt: now,
      firstViewedAt: sql`coalesce(${quotes.firstViewedAt}, ${now.toISOString()}::timestamptz)`,
    })
    .where(
      and(
        eq(quotes.id, quote.id),
        or(isNull(quotes.lastViewedAt), lt(quotes.lastViewedAt, new Date(now.getTime() - VISIT_GAP_MS))),
      ),
    )
    .returning({ viewCount: quotes.viewCount });

  if (row?.viewCount === 1) {
    await db.insert(notifications).values({
      organizationId: quote.organizationId,
      quoteId: quote.id,
      type: "quote_viewed",
      title: `Customer opened ${quote.quoteNumber}`,
      body: "They're looking at the estimate online now. A quick call could help.",
    });
    await db.insert(activityLogs).values({
      organizationId: quote.organizationId,
      entityType: "quote",
      entityId: quote.id,
      action: "viewed_online",
    });
  }
}
