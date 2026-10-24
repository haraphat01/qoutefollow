import OpenAI from "openai";
import { z } from "zod";

export const extractedQuoteFieldsSchema = z.object({
  customerName: z.string().nullable(),
  customerEmail: z.string().nullable(),
  estimateNumber: z.string().nullable(),
  amount: z.number().nullable(),
  jobDescription: z.string().nullable(),
  quoteDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  notes: z.string().nullable(),
  confidence: z.enum(["high", "medium", "low"]),
  /** Each priced line; empty when the estimate only shows a total. */
  lineItems: z
    .array(
      z.object({
        description: z.string(),
        quantity: z.number(),
        unitPrice: z.number(),
      }),
    )
    .default([]),
  /** Percentage, e.g. 8.25. Null when the estimate doesn't state one. */
  taxRate: z.number().nullable().default(null),
});

export type ExtractedQuoteFields = z.infer<typeof extractedQuoteFieldsSchema>;

const systemPrompt = `You extract structured fields from contractor estimate PDFs for roofing, HVAC, and plumbing businesses in the US.
Return JSON only. Use null when a field is missing or uncertain.
amount should be a number in USD without currency symbols.
quoteDate and expirationDate should be ISO dates (YYYY-MM-DD) when possible.
customerEmail must be a valid email or null.
lineItems: every priced line of work or material, with quantity (1 if not shown) and unitPrice in USD. Leave out subtotal, discount, tax and total lines. Return an empty array if the estimate only shows a total.
taxRate: the sales tax percentage if stated (8.25 for 8.25%), otherwise null.`;

export async function extractQuoteFieldsFromText(text: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Extract estimate fields from this document text:\n\n${text.slice(0, 120_000)}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "extracted_quote_fields",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            customerName: { type: ["string", "null"] },
            customerEmail: { type: ["string", "null"] },
            estimateNumber: { type: ["string", "null"] },
            amount: { type: ["number", "null"] },
            jobDescription: { type: ["string", "null"] },
            quoteDate: { type: ["string", "null"] },
            expirationDate: { type: ["string", "null"] },
            notes: { type: ["string", "null"] },
            confidence: { type: "string", enum: ["high", "medium", "low"] },
            lineItems: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  description: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                },
                required: ["description", "quantity", "unitPrice"],
              },
            },
            taxRate: { type: ["number", "null"] },
          },
          required: [
            "customerName",
            "customerEmail",
            "estimateNumber",
            "amount",
            "jobDescription",
            "quoteDate",
            "expirationDate",
            "notes",
            "confidence",
            "lineItems",
            "taxRate",
          ],
        },
      },
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    throw new Error("AI extraction returned no structured data");
  }

  return extractedQuoteFieldsSchema.parse(parsed);
}
