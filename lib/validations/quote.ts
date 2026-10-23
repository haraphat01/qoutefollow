import { z } from "zod";

export const quoteSchema = z.object({
  customerId: z.string().uuid().optional(),
  customerName: z.string().min(2, "Customer name is required").optional(),
  customerEmail: z.string().email("Enter a valid customer email").optional(),
  jobDescription: z.string().min(3, "Describe the job"),
  quoteDate: z.string().min(1, "Quote date is required"),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum([
    "draft",
    "pending",
    "accepted",
    "declined",
    "cancelled",
    "paused",
    "expired",
  ]),
  followUpsEnabled: z.coerce.boolean().optional().default(true),
  sequenceId: z.string().uuid().optional(),
});

export const quoteStatusSchema = quoteSchema.shape.status;

export const updateQuoteSchema = z.object({
  quoteId: z.string().uuid(),
  jobDescription: z.string().min(3, "Describe the job"),
  quoteDate: z.string().min(1, "Quote date is required"),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  followUpsEnabled: z.boolean(),
});
