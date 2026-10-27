/**
 * Writes the sample estimate the demo video imports.
 *
 *   npx tsx scripts/demo/make-estimate-pdf.ts <out.pdf>
 */
import { writeFileSync } from "fs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const out = process.argv[2];
if (!out) {
  console.error("Usage: make-estimate-pdf.ts <out.pdf>");
  process.exit(1);
}

const issued = new Date();
const validUntil = new Date(issued.getTime() + 30 * 24 * 60 * 60 * 1000);
const usDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;

const items: [string, number, number][] = [
  ["Tear-off and disposal", 30, 95],
  ["Architectural shingles installed", 30, 185],
  ["Synthetic underlayment", 30, 22],
  ["Ridge vent", 1, 340],
];
const subtotal = items.reduce((sum, [, qty, price]) => sum + qty * price, 0);
const tax = Math.round(subtotal * 0.0825 * 100) / 100;
const money = (n: number) => `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

async function main() {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([612, 792]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const green = rgb(0.157, 0.341, 0.259);
  const gray = rgb(0.38, 0.45, 0.42);

  const text = (value: string, x: number, y: number, size = 10, f = font, color = rgb(0.13, 0.2, 0.17)) =>
    page.drawText(value, { x, y, size, font: f, color });

  page.drawRectangle({ x: 0, y: 742, width: 612, height: 50, color: green });
  text("LONE STAR ROOFING & EXTERIORS", 48, 761, 15, bold, rgb(1, 1, 1));
  text("2104 Barton Springs Rd, Austin, TX 78704  ·  (512) 555-0148", 48, 712, 9, font, gray);

  text("ESTIMATE", 48, 670, 22, bold, green);
  text("Estimate #: QF-0030", 400, 676, 10);
  text(`Estimate date: ${usDate(issued)}`, 400, 662, 10);
  text(`Valid until: ${usDate(validUntil)}`, 400, 648, 10);

  text("Prepared for: Sam Ortiz", 48, 620, 11, bold);
  text("sam.ortiz@example.com", 48, 605, 10, font, gray);
  text("4410 Shoal Creek Blvd, Austin, TX", 48, 591, 10, font, gray);

  text("Scope: Full roof replacement, 30 squares", 48, 560, 11, bold);

  let y = 525;
  text("Description", 48, y, 9, bold, gray);
  text("Qty", 330, y, 9, bold, gray);
  text("Unit price", 390, y, 9, bold, gray);
  text("Amount", 490, y, 9, bold, gray);
  page.drawLine({ start: { x: 48, y: y - 6 }, end: { x: 564, y: y - 6 }, thickness: 0.5, color: gray });
  for (const [description, qty, price] of items) {
    y -= 24;
    text(description, 48, y);
    text(String(qty), 330, y);
    text(money(price), 390, y);
    text(money(qty * price), 490, y);
  }
  page.drawLine({ start: { x: 48, y: y - 12 }, end: { x: 564, y: y - 12 }, thickness: 0.5, color: gray });
  y -= 34;
  text("Subtotal", 390, y);
  text(money(subtotal), 490, y);
  y -= 18;
  text("Sales tax 8.25%", 390, y);
  text(money(tax), 490, y);
  y -= 22;
  text("Total", 390, y, 12, bold);
  text(money(subtotal + tax), 490, y, 12, bold);

  text("Thank you for the opportunity to earn your business.", 48, 120, 10, font, gray);

  writeFileSync(out, await pdf.save());
  console.log(`Wrote ${out} (total ${money(subtotal + tax)})`);
}

main();
