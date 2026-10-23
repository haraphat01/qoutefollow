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

export async function listQuoteDocuments(
  organizationId: string,
  quoteId: string,
) {
  return db
    .select({ id: quoteDocuments.id, fileName: quoteDocuments.fileName })
    .from(quoteDocuments)
    .where(
      and(
        eq(quoteDocuments.organizationId, organizationId),
        eq(quoteDocuments.quoteId, quoteId),
      ),
    );
}
