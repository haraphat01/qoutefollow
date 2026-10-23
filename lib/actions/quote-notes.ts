"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import type { ActionState } from "@/lib/actions/auth";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { notifications, quoteInternalNotes, quotes } from "@/lib/db/schema";
import { parseMentionedUserIds } from "@/lib/mentions/parse";
import { emailMentions } from "@/lib/email/team-alerts";
import { listOrganizationMembers } from "@/lib/queries/members";

export async function addQuoteInternalNoteAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession().catch(() => null);
  if (!session) {
    return { error: "You must be signed in." };
  }

  const quoteId = formData.get("quoteId");
  const body = String(formData.get("body") ?? "").trim();

  if (typeof quoteId !== "string" || !quoteId) {
    return { error: "Quote is required." };
  }
  if (body.length < 1) {
    return { error: "Write a note before saving." };
  }
  if (body.length > 4000) {
    return { error: "Note is too long." };
  }

  const [quote] = await db
    .select({
      id: quotes.id,
      quoteNumber: quotes.quoteNumber,
    })
    .from(quotes)
    .where(
      and(
        eq(quotes.id, quoteId),
        eq(quotes.organizationId, session.organization.id),
      ),
    )
    .limit(1);

  if (!quote) {
    return { error: "Quote not found." };
  }

  const members = await listOrganizationMembers(session.organization.id);
  const mentionedUserIds = parseMentionedUserIds(body, members);

  await db
    .insert(quoteInternalNotes)
    .values({
      organizationId: session.organization.id,
      quoteId: quote.id,
      userId: session.user.id,
      body,
      mentionedUserIds: JSON.stringify(mentionedUserIds),
    });

  for (const userId of mentionedUserIds) {
    if (userId === session.user.id) {
      continue;
    }
    await db.insert(notifications).values({
      organizationId: session.organization.id,
      quoteId: quote.id,
      type: "mention",
      title: `${session.user.name} mentioned you on ${quote.quoteNumber}`,
      body: body.slice(0, 280),
    });
  }

  await emailMentions({
    organizationId: session.organization.id,
    quoteId: quote.id,
    quoteNumber: quote.quoteNumber,
    authorId: session.user.id,
    authorName: session.user.name,
    note: body,
    mentionedUserIds,
  });

  revalidatePath(`/quotes/${quoteId}`);
  return {};
}
