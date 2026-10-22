import { count, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotes } from "@/lib/db/schema";

export async function nextQuoteNumber(organizationId: string) {
  const [result] = await db
    .select({ value: count() })
    .from(quotes)
    .where(eq(quotes.organizationId, organizationId));

  const next = (result?.value ?? 0) + 1;
  return `QF-${String(next).padStart(4, "0")}`;
}
