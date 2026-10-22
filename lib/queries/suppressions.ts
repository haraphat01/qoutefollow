import { desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { emailSuppressions, quotes } from "@/lib/db/schema";

export async function listEmailSuppressions(organizationId: string) {
  return db
    .select({
      id: emailSuppressions.id,
      email: emailSuppressions.email,
      reason: emailSuppressions.reason,
      createdAt: emailSuppressions.createdAt,
      sourceQuoteId: emailSuppressions.sourceQuoteId,
      quoteNumber: quotes.quoteNumber,
    })
    .from(emailSuppressions)
    .leftJoin(quotes, eq(emailSuppressions.sourceQuoteId, quotes.id))
    .where(eq(emailSuppressions.organizationId, organizationId))
    .orderBy(desc(emailSuppressions.createdAt));
}
