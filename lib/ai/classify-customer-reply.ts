import OpenAI from "openai";
import { z } from "zod";

export const replyClassificationSchema = z.object({
  classification: z.enum([
    "interested",
    "needs_time",
    "declined",
    "wrong_contact",
    "question",
    "unknown",
  ]),
  suggestedQuoteStatus: z.enum([
    "accepted",
    "declined",
    "paused",
    "pending",
  ]),
  summary: z.string().max(280),
});

export type ReplyClassification = z.infer<typeof replyClassificationSchema>;

const systemPrompt = `You classify short email replies from homeowners about contractor estimates (roofing, HVAC, plumbing).
Never suggest discounts or negotiate price. Only classify intent and suggest a quote status for the contractor dashboard.
suggestedQuoteStatus meanings:
- accepted: customer wants to proceed or schedule work
- declined: clear no or chose another vendor
- paused: needs more time, thinking, or asking questions without deciding
- pending: unclear or mixed signal`;

export async function classifyCustomerReply(input: {
  quoteNumber: string;
  jobDescription: string;
  body: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const openai = new OpenAI({ apiKey });
  const response = await openai.responses.parse({
    model: "gpt-4o-mini",
    input: [
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Quote ${input.quoteNumber} (${input.jobDescription}). Customer reply:\n\n${input.body.slice(0, 4000)}`,
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "reply_classification",
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            classification: {
              type: "string",
              enum: [
                "interested",
                "needs_time",
                "declined",
                "wrong_contact",
                "question",
                "unknown",
              ],
            },
            suggestedQuoteStatus: {
              type: "string",
              enum: ["accepted", "declined", "paused", "pending"],
            },
            summary: { type: "string" },
          },
          required: ["classification", "suggestedQuoteStatus", "summary"],
        },
      },
    },
  });

  const parsed = response.output_parsed;
  if (!parsed) {
    return null;
  }

  return replyClassificationSchema.parse(parsed);
}

export { CLASSIFICATION_LABELS } from "@/lib/replies/classification-labels";
