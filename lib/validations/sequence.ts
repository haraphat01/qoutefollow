import { z } from "zod";

export const sequenceStepSchema = z.object({
  /** Omitted for steps added in the editor. */
  id: z.string().uuid().optional(),
  dayOffset: z.coerce.number().int().min(0).max(90),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  bodyTemplate: z.string().trim().min(1, "Message is required").max(8000),
});

export const updateSequenceSchema = z.object({
  sequenceId: z.string().uuid(),
  name: z.string().trim().min(2, "Sequence name is required").max(120),
  steps: z.array(sequenceStepSchema).min(1).max(10),
});

export const organizationEmailSettingsSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is required").max(120),
  replyEmail: z.string().trim().email("Enter a valid reply-to email"),
  businessPhone: z
    .string()
    .trim()
    .max(40)
    .optional()
    .or(z.literal("")),
  emailSignature: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
});
