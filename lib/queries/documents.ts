import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quoteDocuments } from "@/lib/db/schema";

export async function getQuoteDocument(
  organizationId: string,
  documentId: string,
) {
  const [document] = await db
    .select()
    .from(quoteDocuments)
    .where(
      and(
        eq(quoteDocuments.id, documentId),
        eq(quoteDocuments.organizationId, organizationId),
      ),
    )
    .limit(1);

  return document ?? null;
}
