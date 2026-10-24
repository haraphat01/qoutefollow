/**
 * RFC 4180 CSV. Cells starting with = + - @ (or tab/CR) are prefixed with an
 * apostrophe so spreadsheets don't run customer-entered text as formulas.
 */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return (
    "﻿" + // lets Excel detect UTF-8
    rows
      .map((row) =>
        row
          .map((value) => {
            let cell = value === null || value === undefined ? "" : String(value);
            if (/^[=+\-@\t\r]/.test(cell)) {
              cell = `'${cell}`;
            }
            return /[",\n\r]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell;
          })
          .join(","),
      )
      .join("\r\n")
  );
}

export function csvResponse(fileName: string, rows: (string | number | null | undefined)[][]) {
  return new Response(toCsv(rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${fileName}"`,
      "cache-control": "private, no-store",
    },
  });
}

export function isoDate(date: Date | null | undefined) {
  return date ? date.toISOString().slice(0, 10) : "";
}
