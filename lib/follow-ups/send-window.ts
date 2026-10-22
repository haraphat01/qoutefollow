const BUSINESS_HOUR_START = 8;
const BUSINESS_HOUR_END = 18;

export const DEFAULT_SEND_TIMEZONE = "America/Chicago";

export const SEND_TIMEZONE_OPTIONS = [
  { value: "America/New_York", label: "Eastern (America/New_York)" },
  { value: "America/Chicago", label: "Central (America/Chicago)" },
  { value: "America/Denver", label: "Mountain (America/Denver)" },
  { value: "America/Los_Angeles", label: "Pacific (America/Los_Angeles)" },
  { value: "America/Phoenix", label: "Arizona (America/Phoenix)" },
  { value: "America/Anchorage", label: "Alaska (America/Anchorage)" },
  { value: "Pacific/Honolulu", label: "Hawaii (Pacific/Honolulu)" },
] as const;

export function getZonedParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    weekday: "short",
  });
  const parts = formatter.formatToParts(date);
  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") {
      map[part.type] = part.value;
    }
  }
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    weekday: map.weekday ?? "",
  };
}

export function isWeekendWeekday(weekday: string) {
  return weekday === "Sat" || weekday === "Sun";
}

export function isWithinBusinessSendWindow(date: Date, timeZone: string) {
  const { hour, weekday } = getZonedParts(date, timeZone);
  if (isWeekendWeekday(weekday)) {
    return false;
  }
  return hour >= BUSINESS_HOUR_START && hour < BUSINESS_HOUR_END;
}

/** Nudge toward the next Mon–Fri 8am–6pm slot in the org timezone. */
export function alignToBusinessSendWindow(date: Date, timeZone: string) {
  let candidate = new Date(date);
  for (let step = 0; step < 24 * 8; step += 1) {
    if (isWithinBusinessSendWindow(candidate, timeZone)) {
      return candidate;
    }
    candidate = new Date(candidate.getTime() + 60 * 60 * 1000);
  }
  return date;
}
