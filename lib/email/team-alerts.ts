import { appUrl } from "@/lib/billing/stripe";
import {
  accountEmailsEnabled,
  buildCustomerReplyAlertEmail,
  buildMentionEmail,
  excerpt,
  sendAccountEmail,
} from "@/lib/email/account-emails";
import { listOrganizationMembers } from "@/lib/queries/members";

/**
 * Alert everyone in the workspace that a customer replied. Failures are
 * swallowed: the reply is already saved and shown in-app.
 */
export async function emailCustomerReplyAlert(input: {
  organizationId: string;
  quoteId: string;
  quoteNumber: string;
  customerEmail: string;
  body: string;
  summary: string | null;
  /** Address that already received the full forwarded reply, if any. */
  skipEmail?: string | null;
}) {
  if (!accountEmailsEnabled()) {
    return;
  }

  const members = await listOrganizationMembers(input.organizationId);
  const email = buildCustomerReplyAlertEmail({
    quoteNumber: input.quoteNumber,
    customerEmail: input.customerEmail,
    summary: input.summary,
    excerpt: excerpt(input.body),
    url: appUrl(`/quotes/${input.quoteId}`),
  });
  const skip = input.skipEmail?.toLowerCase();

  await Promise.allSettled(
    members
      .filter((member) => member.emailVerifiedAt !== null)
      .filter((member) => member.email.toLowerCase() !== skip)
      .map((member) =>
        sendAccountEmail(member.email, email, { replyTo: input.customerEmail }),
      ),
  );
}

export async function emailMentions(input: {
  organizationId: string;
  quoteId: string;
  quoteNumber: string;
  authorId: string;
  authorName: string;
  note: string;
  mentionedUserIds: string[];
}) {
  if (!accountEmailsEnabled() || input.mentionedUserIds.length === 0) {
    return;
  }

  const members = await listOrganizationMembers(input.organizationId);
  const email = buildMentionEmail({
    authorName: input.authorName,
    quoteNumber: input.quoteNumber,
    note: excerpt(input.note, 1000),
    url: appUrl(`/quotes/${input.quoteId}`),
  });

  await Promise.allSettled(
    members
      .filter((member) => input.mentionedUserIds.includes(member.id))
      .filter((member) => member.id !== input.authorId)
      .filter((member) => member.emailVerifiedAt !== null)
      .map((member) => sendAccountEmail(member.email, email)),
  );
}
