import type { TemplateVariables } from "./template-variables";

export function renderEmailTemplate(
  template: string,
  variables: TemplateVariables,
) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    return variables[key as keyof TemplateVariables] ?? "";
  });
}

export function buildFollowUpEmailText(input: {
  body: string;
  businessName: string;
  replyEmail?: string | null;
  businessPhone?: string | null;
  emailSignature?: string | null;
  mailingAddress?: string | null;
  unsubscribeUrl: string;
}) {
  const sections: string[] = [input.body.trim()];

  if (input.emailSignature?.trim()) {
    sections.push("", input.emailSignature.trim());
  }

  sections.push("", `—`, input.businessName);

  if (input.replyEmail?.trim()) {
    sections.push(`Email us: ${input.replyEmail.trim()}`);
  }

  if (input.businessPhone?.trim()) {
    sections.push(`Call us: ${input.businessPhone.trim()}`);
  }

  sections.push(
    "",
    "—",
    `You are receiving this message because ${input.businessName} sent you a service estimate and requested permission to follow up.`,
  );

  if (input.mailingAddress?.trim()) {
    sections.push("", input.mailingAddress.trim());
  }

  sections.push(
    "",
    `To stop follow-up emails for this business, unsubscribe: ${input.unsubscribeUrl}`,
  );

  return sections.join("\n");
}
