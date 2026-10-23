import { parseEmailFromAddress } from "./sending-domain";

const REPLY_LOCAL_PREFIX = "reply+";
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Domain configured for Resend Inbound (e.g. `reply.yourcompany.com`).
 * When set, follow-ups use a per-quote Reply-To so customer replies reach
 * the webhook and can pause automation.
 */
export function inboundReplyDomain() {
  const domain = process.env.INBOUND_REPLY_DOMAIN?.trim().toLowerCase();
  return domain ? domain : null;
}

export function replyAddressForQuote(quoteId: string) {
  const domain = inboundReplyDomain();
  if (!domain) {
    return null;
  }
  return `${REPLY_LOCAL_PREFIX}${quoteId}@${domain}`;
}

/** Find the quote id encoded in a `reply+<quoteId>@` recipient, if any. */
export function quoteIdFromReplyAddresses(addresses: string[]) {
  for (const raw of addresses) {
    const address = parseEmailFromAddress(raw)?.address;
    if (!address) {
      continue;
    }
    const local = address.slice(0, address.lastIndexOf("@"));
    if (!local.startsWith(REPLY_LOCAL_PREFIX)) {
      continue;
    }
    const candidate = local.slice(REPLY_LOCAL_PREFIX.length);
    if (UUID_PATTERN.test(candidate)) {
      return candidate.toLowerCase();
    }
  }
  return null;
}
