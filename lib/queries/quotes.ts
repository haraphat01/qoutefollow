import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, quotes, users } from "@/lib/db/schema";

export async function listQuotes(
  organizationId: string,
  filter: { assignedTo?: string | null } = {},
) {
  return db
    .select({
      quote: quotes,
      customerName: customers.name,
      customerEmail: customers.email,
      assigneeName: users.name,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .leftJoin(users, eq(users.id, quotes.assignedUserId))
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        filter.assignedTo === undefined
          ? undefined
          : filter.assignedTo === null
            ? isNull(quotes.assignedUserId)
            : eq(quotes.assignedUserId, filter.assignedTo),
      ),
    )
    .orderBy(desc(quotes.updatedAt));
}

export async function getQuoteDetail(organizationId: string, quoteId: string) {
  const [row] = await db
    .select({
      quote: quotes,
      customer: customers,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(
      and(eq(quotes.id, quoteId), eq(quotes.organizationId, organizationId)),
    )
    .limit(1);

  return row ?? null;
}
