import { and, eq, gte } from "drizzle-orm";

import { db } from "@/lib/db";
import { quotes, users } from "@/lib/db/schema";

export type WinRateRow = {
  label: string;
  quotes: number;
  won: number;
  lost: number;
  open: number;
  /** Won ÷ decided (won + lost); null until something is decided. */
  winRate: number | null;
  wonValue: number;
};

const AMOUNT_BANDS = [
  { label: "Under $1,000", max: 1_000 },
  { label: "$1,000–$5,000", max: 5_000 },
  { label: "$5,000–$20,000", max: 20_000 },
  { label: "$20,000+", max: Infinity },
];

const LOST = new Set(["declined", "expired", "cancelled"]);

function summarize(label: string, rows: { status: string; amount: number }[]): WinRateRow {
  const won = rows.filter((row) => row.status === "accepted");
  const lost = rows.filter((row) => LOST.has(row.status)).length;
  return {
    label,
    quotes: rows.length,
    won: won.length,
    lost,
    open: rows.length - won.length - lost,
    winRate: won.length + lost > 0 ? won.length / (won.length + lost) : null,
    wonValue: won.reduce((sum, row) => sum + row.amount, 0),
  };
}

function groupBy<T>(rows: T[], key: (row: T) => string) {
  const groups = new Map<string, T[]>();
  for (const row of rows) {
    const value = key(row);
    groups.set(value, [...(groups.get(value) ?? []), row]);
  }
  return groups;
}

/** Win rates by job type, salesperson and size, plus a monthly trend. */
export async function getWinRateReport(organizationId: string, months = 6) {
  const since = new Date();
  since.setMonth(since.getMonth() - months + 1, 1);
  since.setHours(0, 0, 0, 0);

  const raw = await db
    .select({
      status: quotes.status,
      amount: quotes.amount,
      jobType: quotes.jobType,
      assignee: users.name,
      createdAt: quotes.createdAt,
      sentAt: quotes.sentAt,
      acceptedAt: quotes.acceptedAt,
      updatedAt: quotes.updatedAt,
    })
    .from(quotes)
    .leftJoin(users, eq(users.id, quotes.assignedUserId))
    .where(and(eq(quotes.organizationId, organizationId), gte(quotes.createdAt, since)));

  const rows = raw.map((row) => ({ ...row, amount: Number(row.amount) }));
  const sortRows = (list: WinRateRow[]) => list.sort((a, b) => b.quotes - a.quotes);

  const byJobType = sortRows(
    [...groupBy(rows, (row) => row.jobType?.trim() || "Not set")].map(([label, group]) => summarize(label, group)),
  );
  const bySalesperson = sortRows(
    [...groupBy(rows, (row) => row.assignee ?? "Unassigned")].map(([label, group]) => summarize(label, group)),
  );
  const byAmount = AMOUNT_BANDS.map((band, index) =>
    summarize(
      band.label,
      rows.filter((row) => row.amount < band.max && row.amount >= (AMOUNT_BANDS[index - 1]?.max ?? 0)),
    ),
  ).filter((row) => row.quotes > 0);

  const monthly = Array.from({ length: months }, (_, index) => {
    const start = new Date(since);
    start.setMonth(since.getMonth() + index);
    const end = new Date(start);
    end.setMonth(start.getMonth() + 1);
    const inMonth = (date: Date | null) => Boolean(date && date >= start && date < end);
    const won = rows.filter((row) => row.status === "accepted" && inMonth(row.acceptedAt ?? row.updatedAt));
    return {
      label: start.toLocaleString("en-US", { month: "short", year: "2-digit" }),
      created: rows.filter((row) => inMonth(row.createdAt)).length,
      won: won.length,
      wonValue: won.reduce((sum, row) => sum + row.amount, 0),
    };
  });

  const closeDays = rows
    .filter((row) => row.status === "accepted")
    .map((row) => ((row.acceptedAt ?? row.updatedAt).getTime() - (row.sentAt ?? row.createdAt).getTime()) / 86_400_000)
    .filter((days) => days >= 0);
  const avgDaysToClose = closeDays.length
    ? closeDays.reduce((sum, days) => sum + days, 0) / closeDays.length
    : null;

  return { months, overall: summarize("All quotes", rows), byJobType, bySalesperson, byAmount, monthly, avgDaysToClose };
}
