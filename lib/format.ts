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

export function formatDate(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
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
