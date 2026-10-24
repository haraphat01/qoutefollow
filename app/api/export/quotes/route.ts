import { desc, eq } from "drizzle-orm";

import { getSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { customers, quotes, users } from "@/lib/db/schema";
import { csvResponse, isoDate } from "@/lib/export/csv";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const rows = await db
    .select({ quote: quotes, customer: customers, assignee: users.name })
    .from(quotes)
    .innerJoin(customers, eq(customers.id, quotes.customerId))
    .leftJoin(users, eq(users.id, quotes.assignedUserId))
    .where(eq(quotes.organizationId, session.organization.id))
    .orderBy(desc(quotes.createdAt));

  return csvResponse(`quotes-${isoDate(new Date())}.csv`, [
    [
      "Quote number", "Status", "Customer", "Customer email", "Job type", "Job description",
      "Amount", "Tax rate %", "Quote date", "Expires", "Sent", "Accepted", "Accepted by",
      "Online views", "Assigned to", "Created",
    ],
    ...rows.map(({ quote, customer, assignee }) => [
      quote.quoteNumber,
      quote.status,
      customer.name,
      customer.email,
      quote.jobType,
      quote.jobDescription,
      quote.amount,
      Number(quote.taxRate) || "",
      isoDate(quote.quoteDate),
      isoDate(quote.expiresAt),
      isoDate(quote.sentAt),
      isoDate(quote.acceptedAt),
      quote.acceptedName,
      quote.viewCount,
      assignee,
      isoDate(quote.createdAt),
    ]),
  ]);
}
