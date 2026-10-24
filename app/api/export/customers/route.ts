import { asc, eq, sql } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customers, quotes } from "@/lib/db/schema";
import { csvResponse, isoDate } from "@/lib/export/csv";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({
      customer: customers,
      quotes: sql<number>`count(${quotes.id})::int`,
      won: sql<string>`coalesce(sum(${quotes.amount}) filter (where ${quotes.status} = 'accepted'), 0)`,
    })
    .from(customers)
    .leftJoin(quotes, eq(quotes.customerId, customers.id))
    .where(eq(customers.organizationId, session.organization.id))
    .groupBy(customers.id)
    .orderBy(asc(customers.name));

  return csvResponse(`customers-${isoDate(new Date())}.csv`, [
    ["Name", "Email", "Phone", "Quotes", "Won value", "Created"],
    ...rows.map(({ customer, quotes: count, won }) => [
      customer.name,
      customer.email,
      customer.phone,
      count,
      Number(won).toFixed(2),
      isoDate(customer.createdAt),
    ]),
  ]);
}
