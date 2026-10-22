export const EMAIL_TEMPLATE_VARIABLES = [
  { key: "customer_name", label: "Customer name" },
  { key: "job_description", label: "Job description" },
  { key: "quote_number", label: "Quote number" },
  { key: "quote_amount", label: "Formatted quote amount" },
  { key: "expires_at", label: "Expiration date (if set)" },
  { key: "business_name", label: "Your business name" },
  { key: "reply_email", label: "Reply-to email" },
  { key: "business_phone", label: "Business phone (if set)" },
] as const;

export type TemplateVariableKey =
  (typeof EMAIL_TEMPLATE_VARIABLES)[number]["key"];

export type TemplateVariables = Record<TemplateVariableKey, string>;
