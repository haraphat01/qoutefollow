import { afterEach, describe, expect, it } from "vitest";

import {
  quoteIdFromReplyAddresses,
  replyAddressForQuote,
} from "@/lib/email/reply-address";

const QUOTE_ID = "3f2b8c1e-9a4d-4e5f-8b6a-1c2d3e4f5a6b";

describe("per-quote reply addresses", () => {
  afterEach(() => {
    delete process.env.INBOUND_REPLY_DOMAIN;
  });

  it("is disabled without an inbound domain", () => {
    expect(replyAddressForQuote(QUOTE_ID)).toBeNull();
  });

  it("round-trips the quote id through the reply address", () => {
    process.env.INBOUND_REPLY_DOMAIN = "reply.example.com";
    const address = replyAddressForQuote(QUOTE_ID);
    expect(address).toBe(`reply+${QUOTE_ID}@reply.example.com`);
    expect(
      quoteIdFromReplyAddresses(["Someone <other@example.com>", `Quotes <${address}>`]),
    ).toBe(QUOTE_ID);
  });

  it("ignores addresses without a valid quote id", () => {
    expect(quoteIdFromReplyAddresses(["reply+not-a-uuid@reply.example.com"])).toBeNull();
  });
});
