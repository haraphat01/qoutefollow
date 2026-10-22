import { z } from "zod";

export const mailingComplianceSchema = z.object({
  mailingAddress: z
    .string()
    .trim()
    .min(10, "Enter a full postal mailing address")
    .max(500),
});

function isValidIanaTimezone(value: string) {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export const sendTimezoneSchema = z.object({
  sendTimezone: z
    .string()
    .trim()
    .min(1, "Choose a timezone")
    .max(64)
    .refine(isValidIanaTimezone, "Invalid timezone"),
});
