import { and, eq, exists, inArray, isNotNull, lte, not } from "drizzle-orm";

import { db } from "@/lib/db";
import {
  customers,
  quotes,
  scheduledFollowUps,
} from "@/lib/db/schema";

const STALE_OPEN_QUOTE_DAYS = 7;

export type ContractorReminder = {
  id: string;
  kind:
    | "stale_open_quote"
    | "automation_complete"
    | "unconfirmed_contact";
  title: string;
  description: string;
  quoteId: string;
  quoteNumber: string;
  customerName: string;
};

export async function getContractorReminders(organizationId: string) {
  const staleBefore = new Date();
  staleBefore.setDate(staleBefore.getDate() - STALE_OPEN_QUOTE_DAYS);

  const staleRows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      customerName: customers.name,
      approvedAt: quotes.approvedAt,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        inArray(quotes.status, ["pending", "paused"]),
        isNotNull(quotes.approvedAt),
        lte(quotes.approvedAt, staleBefore),
      ),
    )
    .orderBy(quotes.approvedAt)
    .limit(8);

  const automationCompleteRows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      customerName: customers.name,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.status, "pending"),
        eq(quotes.followUpsEnabled, true),
        not(
          exists(
            db
              .select({ id: scheduledFollowUps.id })
              .from(scheduledFollowUps)
              .where(
                and(
                  eq(scheduledFollowUps.quoteId, quotes.id),
                  eq(scheduledFollowUps.status, "scheduled"),
                ),
              ),
          ),
        ),
        exists(
          db
            .select({ id: scheduledFollowUps.id })
            .from(scheduledFollowUps)
            .where(
              and(
                eq(scheduledFollowUps.quoteId, quotes.id),
                eq(scheduledFollowUps.status, "sent"),
              ),
            ),
        ),
      ),
    )
    .limit(8);

  const unconfirmedRows = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
      customerName: customers.name,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.contactConfirmed, false),
        inArray(quotes.status, ["draft", "pending"]),
      ),
    )
    .limit(8);

  const reminders: ContractorReminder[] = [];

  for (const row of staleRows) {
    reminders.push({
      id: `stale-${row.id}`,
      kind: "stale_open_quote",
      title: `${row.quoteNumber} needs attention`,
      description: `${row.customerName} — open ${STALE_OPEN_QUOTE_DAYS}+ days without a decision.`,
      quoteId: row.id,
      quoteNumber: row.quoteNumber,
      customerName: row.customerName,
    });
  }

  for (const row of automationCompleteRows) {
    reminders.push({
      id: `auto-${row.id}`,
      kind: "automation_complete",
      title: `Call ${row.customerName}?`,
      description: `${row.quoteNumber} — automated follow-ups are done; a personal touch may help.`,
      quoteId: row.id,
      quoteNumber: row.quoteNumber,
      customerName: row.customerName,
    });
  }

  for (const row of unconfirmedRows) {
    reminders.push({
      id: `contact-${row.id}`,
      kind: "unconfirmed_contact",
      title: `Confirm contact for ${row.quoteNumber}`,
      description: `${row.customerName} — verify email before sending follow-ups.`,
      quoteId: row.id,
      quoteNumber: row.quoteNumber,
      customerName: row.customerName,
    });
  }

  return reminders.slice(0, 12);
}

export async function countContractorReminders(organizationId: string) {
  const reminders = await getContractorReminders(organizationId);
  return reminders.length;
}
