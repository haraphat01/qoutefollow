import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, quotes } from "@/lib/db/schema";

export async function listQuotes(organizationId: string) {
  return db
    .select({
      quote: quotes,
      customerName: customers.name,
      customerEmail: customers.email,
    })
    .from(quotes)
    .innerJoin(customers, eq(quotes.customerId, customers.id))
    .where(eq(quotes.organizationId, organizationId))
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
