import { PDFParse } from "pdf-parse";

const MIN_TEXT_LENGTH = 80;

export async function extractTextFromPdf(buffer: Buffer) {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();
  return result.text?.trim() ?? "";
}

export function needsOcrFallback(text: string) {
  return text.replace(/\s+/g, "").length < MIN_TEXT_LENGTH;
}
