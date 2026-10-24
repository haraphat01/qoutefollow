import Link from "next/link";
import { ArrowLeft, FilePlus2, ShieldCheck } from "lucide-react";

import { QuoteForm } from "@/components/quotes/quote-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listCustomers } from "@/lib/queries/customers";
import { listOrganizationSequences } from "@/lib/queries/sequences";
import { listOrganizationMembers } from "@/lib/queries/members";
import {
  getQuotingSettings,
  listJobTypes,
  listPriceBook,
  listQuoteTemplates,
} from "@/lib/queries/quoting";
import { getSession } from "@/lib/auth/session";

export default async function NewQuotePage({
  searchParams,
}: {
  searchParams: Promise<{ customerId?: string; templateId?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { customerId, templateId } = await searchParams;
  const organizationId = session.organization.id;

  const [customers, sequences, members, templates, priceBook, jobTypes, settings] = await Promise.all([
    listCustomers(organizationId),
    listOrganizationSequences(organizationId),
    listOrganizationMembers(organizationId),
    listQuoteTemplates(organizationId),
    listPriceBook(organizationId),
    listJobTypes(organizationId),
    getQuotingSettings(organizationId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/quotes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> Quotes
      </Link>
      <div className="flex items-start gap-4">
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#edf4ed] text-[#4c7959] sm:grid"><FilePlus2 className="size-5" /></span>
        <div>
          <p className="eyebrow mb-2">QUOTE PIPELINE</p>
          <h1 className="page-heading">Create a quote</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Add the estimate details and choose whether to start a follow-up schedule.
          </p>
        </div>
      </div>
      <Card className="gap-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <CardTitle>Estimate details</CardTitle>
          <CardDescription className="mt-1">Keep the important job details clear and easy to find.</CardDescription>
        </CardHeader>
        <CardContent className="pt-5">
          <QuoteForm
            defaultCustomerId={customerId}
            defaultTemplateId={templateId}
            members={members.map((member) => ({ id: member.id, name: member.name }))}
            currentUserId={session.user.id}
            templates={templates}
            priceBook={priceBook}
            jobTypes={jobTypes}
            defaultTaxRate={settings.defaultTaxRate}
            customers={customers.map((customer) => ({
              id: customer.id,
              name: customer.name,
              email: customer.email,
            }))}
            sequences={sequences.map((sequence) => ({
              id: sequence.id,
              name: sequence.name,
              isDefault: sequence.isDefault,
            }))}
          />
        </CardContent>
      </Card>
      <p className="flex items-start gap-2 px-1 text-xs leading-relaxed text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
        Follow-ups pause automatically when you mark a quote accepted, declined, or cancelled.
      </p>
    </div>
  );
}
