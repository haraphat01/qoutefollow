import { z } from "zod";

export const sequenceStepSchema = z.object({
  id: z.string().uuid(),
  dayOffset: z.coerce.number().int().min(0).max(90),
  subject: z.string().trim().min(1, "Subject is required").max(200),
  bodyTemplate: z.string().trim().min(1, "Message is required").max(8000),
});

export const updateSequenceSchema = z.object({
  sequenceId: z.string().uuid(),
  steps: z.array(sequenceStepSchema).min(1).max(10),
});

export const organizationEmailSettingsSchema = z.object({
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
