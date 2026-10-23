import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers, quotes } from "@/lib/db/schema";

export async function listCustomers(organizationId: string) {
  return db
    .select()
    .from(customers)
    .where(eq(customers.organizationId, organizationId))
    .orderBy(desc(customers.updatedAt));
}

export async function getCustomer(organizationId: string, customerId: string) {
  const [customer] = await db
    .select()
    .from(customers)
    .where(
      and(
        eq(customers.id, customerId),
        eq(customers.organizationId, organizationId),
      ),
    )
    .limit(1);

  return customer ?? null;
}

export async function listCustomerQuotes(
  organizationId: string,
  customerId: string,
) {
  return db
    .select()
    .from(quotes)
    .where(
      and(
        eq(quotes.organizationId, organizationId),
        eq(quotes.customerId, customerId),
      ),
    )
    .orderBy(desc(quotes.quoteDate));
}
