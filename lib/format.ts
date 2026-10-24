export function formatCurrency(amount: string | number) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Exact to the cent, for line items and totals. */
export function formatMoney(amount: string | number) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

/**
 * Pass the business's time zone for real moments in time (sends, notes,
 * acceptances); the server runs in UTC, so evening events in US time zones
 * would otherwise show the next day, and client components would disagree
 * with the server render.
 */
export function formatDate(date: Date | string, timeZone?: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone,
  }).format(value);
}

export function formatDateTime(date: Date | string, timeZone?: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(value);
}

/**
 * Parse a `<input type="date">` value. Bare dates are UTC midnight, which shows
 * as the previous day in US timezones, so anchor quote dates at midday UTC and
 * expirations at the end of the UTC day.
 */
export function parseDateInput(value: string, kind: "start" | "end" = "start") {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T${kind === "end" ? "23:59:59" : "12:00:00"}Z`);
  }
  return new Date(value);
}

/** Format a Date as a `<input type="date">` value. */
export function toDateInputValue(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}
