import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";

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
