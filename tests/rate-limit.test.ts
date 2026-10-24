import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db", () => ({ db: {} }));

import { clientIp } from "@/lib/auth/rate-limit";

describe("clientIp", () => {
  it("prefers the proxy's X-Real-IP", () => {
    expect(clientIp(new Headers({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "1.1.1.1, 203.0.113.9" }))).toBe("203.0.113.9");
  });
  it("uses the last X-Forwarded-For hop, which the proxy added, not a spoofable first one", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "6.6.6.6, 198.51.100.7" }))).toBe("198.51.100.7");
  });
  it("returns null without proxy headers", () => {
    expect(clientIp(new Headers())).toBeNull();
  });
});
