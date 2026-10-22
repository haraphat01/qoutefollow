import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  emailEvents,
  followUpSteps,
  scheduledFollowUps,
} from "@/lib/db/schema";

export type QuoteEmailAuditEntry = {
  id: string;
  at: Date;
  kind:
    | "sent"
    | "delivered"
    | "bounced"
    | "complained"
    | "opened"
    | "clicked"
    | "received";
  label: string;
  detail: string | null;
};

const EVENT_LABELS: Record<string, string> = {
  sent: "Follow-up email sent",
  delivered: "Delivered",
  bounced: "Bounced",
  complained: "Spam complaint",
  opened: "Opened",
  clicked: "Link clicked",
  received: "Customer reply received",
};

export async function getQuoteEmailAuditLog(
  organizationId: string,
  quoteId: string,
) {
  const events = await db
    .select({
      id: emailEvents.id,
      eventType: emailEvents.eventType,
      createdAt: emailEvents.createdAt,
      payload: emailEvents.payload,
      scheduledFollowUpId: emailEvents.scheduledFollowUpId,
      dayOffset: followUpSteps.dayOffset,
    })
    .from(emailEvents)
    .leftJoin(
      scheduledFollowUps,
      eq(emailEvents.scheduledFollowUpId, scheduledFollowUps.id),
    )
    .leftJoin(followUpSteps, eq(scheduledFollowUps.stepId, followUpSteps.id))
    .where(
      and(
        eq(emailEvents.organizationId, organizationId),
        eq(emailEvents.quoteId, quoteId),
      ),
    )
    .orderBy(asc(emailEvents.createdAt));

  return events.map((row) => {
    let detail: string | null = null;
    if (row.payload) {
      try {
        const parsed = JSON.parse(row.payload) as {
          subject?: string;
          to?: string;
        };
        if (parsed.subject) {
          detail = parsed.subject;
        } else if (parsed.to) {
          detail = `To ${parsed.to}`;
        }
      } catch {
        detail = null;
      }
    }

    const day =
      row.dayOffset != null ? ` (Day ${row.dayOffset})` : "";

    return {
      id: row.id,
      at: row.createdAt,
      kind: row.eventType,
      label: `${EVENT_LABELS[row.eventType] ?? row.eventType}${day}`,
      detail,
    } satisfies QuoteEmailAuditEntry;
  });
}
