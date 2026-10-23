import { z } from "zod";

export const confirmImportedQuoteSchema = z.object({
  documentId: z.string().uuid(),
  customerName: z.string().min(2, "Customer name is required"),
  customerEmail: z.string().email("Enter a valid customer email"),
  estimateNumber: z.string().optional(),
  jobDescription: z.string().min(3, "Describe the job"),
  quoteDate: z.string().min(1, "Quote date is required"),
  expiresAt: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["draft", "pending"]),
  followUpsEnabled: z.coerce.boolean().optional().default(true),
  contactConfirmed: z
    .boolean()
    .refine((value) => value === true, {
      message: "Confirm the customer email before saving this quote.",
    }),
});
