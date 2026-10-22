import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileCheck2, LoaderCircle } from "lucide-react";

import { extractedQuoteFieldsSchema } from "@/lib/ai/extract-quote-fields";
import { getSession } from "@/lib/auth/session";
import { ImportConfirmForm } from "@/components/quotes/import-confirm-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getQuoteDocument } from "@/lib/queries/documents";

export default async function ImportConfirmPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const { documentId } = await params;
  const document = await getQuoteDocument(session.organization.id, documentId);

  if (!document) {
    notFound();
  }

  if (document.quoteId) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/quotes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Quotes
        </Link>
        <Card className="gap-0">
          <CardContent className="flex flex-col items-center px-6 py-12 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#edf4ed] text-[#4c7959]"><CheckCircle2 className="size-6" /></span>
            <h1 className="mt-4 text-lg font-semibold">This estimate is already saved</h1>
            <p className="mt-2 text-sm text-muted-foreground">The PDF has already been turned into a quote.</p>
            <Link href={`/quotes/${document.quoteId}`} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
              View saved quote <FileCheck2 className="size-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (document.extractionStatus === "processing") {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/quotes/import" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
          <ArrowLeft className="size-4" /> Import another PDF
        </Link>
        <Card className="gap-0">
          <CardHeader className="items-center px-6 pb-5 pt-9 text-center">
            <span className="grid size-12 place-items-center rounded-full bg-[#edf1f4] text-[#557080]">
              <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
            </span>
            <CardTitle className="mt-4 text-xl">Reading your estimate</CardTitle>
            <CardDescription className="mt-1 max-w-sm">
              We’re preparing the quote details from your PDF. This can take a little longer for scanned pages.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8 text-center">
            <p className="text-xs text-muted-foreground">If the review doesn’t appear, refresh this page in a moment.</p>
            <Link href={`/quotes/import/${document.id}`} className="mt-4 inline-flex rounded-lg border border-border px-4 py-2 text-sm font-semibold hover:bg-muted">
              Refresh status
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fallback = extractedQuoteFieldsSchema.parse({
    customerName: null,
    customerEmail: null,
    estimateNumber: null,
    amount: null,
    jobDescription: null,
    quoteDate: null,
    expirationDate: null,
    notes: null,
    confidence: "low",
  });

  const fields = document.extractedPayload
    ? extractedQuoteFieldsSchema.parse(JSON.parse(document.extractedPayload))
    : fallback;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/quotes/import" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary">
        <ArrowLeft className="size-4" /> Import another PDF
      </Link>
      <div>
        <p className="eyebrow mb-2">REVIEW BEFORE SAVING</p>
        <h1 className="page-heading">Confirm quote details</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
          We filled in what we could find. Check every field and confirm the customer’s contact details before saving.
        </p>
      </div>
      <Card className="gap-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-[#edf4ed] text-[#4c7959]"><FileCheck2 className="size-5" /></span>
            <div>
              <CardTitle>Review extracted details</CardTitle>
              <CardDescription className="mt-1">Source: {document.fileName} · Extraction: {document.extractionMethod ?? "manual review"}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-5">
          <ImportConfirmForm
            documentId={document.id}
            fileName={document.fileName}
            extractionError={document.extractionError}
            fields={fields}
          />
        </CardContent>
      </Card>
    </div>
  );
}
