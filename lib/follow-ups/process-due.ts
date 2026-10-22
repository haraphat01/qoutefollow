import { and, eq, lte, or, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotes, scheduledFollowUps } from "@/lib/db/schema";
import { sendScheduledFollowUp } from "@/lib/follow-ups/send-follow-up";
import {
  isRetryableError,
  MAX_SEND_ATTEMPTS,
  PROCESSING_LOCK_MAX_AGE_MS,
} from "@/lib/follow-ups/retry";

async function releaseStaleProcessingLocks() {
  const staleBefore = new Date(Date.now() - PROCESSING_LOCK_MAX_AGE_MS);
  await db
    .update(scheduledFollowUps)
    .set({ status: "scheduled", processingStartedAt: null })
    .where(
      and(
        eq(scheduledFollowUps.status, "processing"),
        lte(scheduledFollowUps.processingStartedAt, staleBefore),
      ),
    );
}

export async function processDueFollowUps(limit = 25) {
  await releaseStaleProcessingLocks();

  const now = new Date();
  const due = await db
    .select({
      scheduled: scheduledFollowUps,
    })
    .from(scheduledFollowUps)
    .innerJoin(quotes, eq(scheduledFollowUps.quoteId, quotes.id))
    .where(
      and(
        or(
          and(
            eq(scheduledFollowUps.status, "scheduled"),
            lte(scheduledFollowUps.scheduledFor, now),
          ),
          and(
            eq(scheduledFollowUps.status, "failed"),
            lte(scheduledFollowUps.nextRetryAt, now),
            sql`${scheduledFollowUps.attemptCount} < ${MAX_SEND_ATTEMPTS}`,
          ),
        ),
      ),
    )
    .limit(limit);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let retried = 0;

  for (const row of due) {
    if (row.scheduled.status === "failed") {
      await db
        .update(scheduledFollowUps)
        .set({ status: "scheduled", scheduledFor: now })
        .where(eq(scheduledFollowUps.id, row.scheduled.id));
    }

    const result = await sendScheduledFollowUp(row.scheduled.id);
    if (result.ok) {
      sent += 1;
      continue;
    }

    const softSkip =
      result.reason.includes("expired") ||
      result.reason.includes("eligible") ||
      result.reason.includes("unsubscribed") ||
      result.reason.includes("Not yet due");

    if (softSkip) {
      skipped += 1;
      continue;
    }

    const message = result.reason;
    if (isRetryableError(message)) {
      const [current] = await db
        .select({ attemptCount: scheduledFollowUps.attemptCount })
        .from(scheduledFollowUps)
        .where(eq(scheduledFollowUps.id, row.scheduled.id))
        .limit(1);
      const attempts = current?.attemptCount ?? 0;
      if (attempts < MAX_SEND_ATTEMPTS) {
        retried += 1;
      } else {
        failed += 1;
      }
    } else {
      failed += 1;
    }
  }

  return { processed: due.length, sent, skipped, failed, retried };
}
