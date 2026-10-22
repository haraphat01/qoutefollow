import { describe, expect, it } from "vitest";

import {
  alignToBusinessSendWindow,
  isWithinBusinessSendWindow,
} from "@/lib/follow-ups/send-window";

describe("business send window", () => {
  it("treats weekday business hours as in-window", () => {
    const wednesdayNoon = new Date("2026-10-21T17:00:00.000Z");
    expect(isWithinBusinessSendWindow(wednesdayNoon, "America/Chicago")).toBe(
      true,
    );
  });

  it("rejects weekends", () => {
    const saturdayMorning = new Date("2026-10-24T15:00:00.000Z");
    expect(
      isWithinBusinessSendWindow(saturdayMorning, "America/Chicago"),
    ).toBe(false);
  });

  it("aligns Sunday night to Monday morning", () => {
    const sundayNight = new Date("2026-10-25T04:00:00.000Z");
    const aligned = alignToBusinessSendWindow(
      sundayNight,
      "America/Chicago",
    );
    expect(isWithinBusinessSendWindow(aligned, "America/Chicago")).toBe(true);
    expect(aligned.getTime()).toBeGreaterThan(sundayNight.getTime());
  });
});
