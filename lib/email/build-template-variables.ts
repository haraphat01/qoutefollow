import { formatCurrency, formatDate } from "@/lib/format";
import type { TemplateVariables } from "@/lib/email/template-variables";

export function buildFollowUpTemplateVariables(input: {
  customerName: string;
  jobDescription: string;
  quoteNumber: string;
  amount: string;
  expiresAt: Date | null;
  businessName: string;
  replyEmail: string | null;
  businessPhone: string | null;
}): TemplateVariables {
  return {
    customer_name: input.customerName,
    job_description: input.jobDescription,
    quote_number: input.quoteNumber,
    quote_amount: formatCurrency(input.amount),
    expires_at: input.expiresAt ? formatDate(input.expiresAt) : "",
    business_name: input.businessName,
    reply_email: input.replyEmail ?? "",
    business_phone: input.businessPhone ?? "",
  };
}
