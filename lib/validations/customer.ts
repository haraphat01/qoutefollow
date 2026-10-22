import { z } from "zod";

export const customerSchema = z.object({
  name: z.string().min(2, "Customer name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  notes: z.string().optional(),
});
