import { describe, expect, it } from "vitest";

import { assertSameOrganization } from "@/lib/security/org-scope";

describe("organization data isolation", () => {
  it("allows matching organization ids", () => {
    expect(() =>
      assertSameOrganization("org-a", "org-a"),
    ).not.toThrow();
  });

  it("blocks cross-organization access", () => {
    expect(() =>
      assertSameOrganization("org-a", "org-b"),
    ).toThrowError("ORG_FORBIDDEN");
  });
});
