import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { quoteInternalNotes, users } from "@/lib/db/schema";

export async function listQuoteInternalNotes(
  organizationId: string,
  quoteId: string,
) {
  return db
    .select({
      note: quoteInternalNotes,
      authorName: users.name,
    })
    .from(quoteInternalNotes)
    .innerJoin(users, eq(quoteInternalNotes.userId, users.id))
    .where(
      and(
        eq(quoteInternalNotes.organizationId, organizationId),
        eq(quoteInternalNotes.quoteId, quoteId),
      ),
    )
    .orderBy(asc(quoteInternalNotes.createdAt));
}
