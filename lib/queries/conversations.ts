import { and, desc, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { conversations } from "@/lib/db/schema";

export async function listQuoteConversations(
  organizationId: string,
  quoteId: string,
) {
  return db
    .select()
    .from(conversations)
    .where(
      and(
        eq(conversations.organizationId, organizationId),
        eq(conversations.quoteId, quoteId),
      ),
    )
    .orderBy(desc(conversations.createdAt));
}
