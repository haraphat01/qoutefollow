import Link from "next/link";
import { ArrowLeft, FileUp, ScanText, ShieldCheck } from "lucide-react";

import { PdfUploadForm } from "@/components/quotes/pdf-upload-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ImportQuotePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/quotes" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft className="size-4" /> Quotes
      </Link>
      <div className="flex items-start gap-4">
        <span className="hidden size-12 shrink-0 place-items-center rounded-2xl bg-[#edf4ed] text-[#4c7959] sm:grid"><FileUp className="size-5" /></span>
        <div>
          <p className="eyebrow mb-2">FASTER QUOTE ENTRY</p>
          <h1 className="page-heading">Import an estimate</h1>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Upload a PDF to pre-fill quote details. You’ll review and confirm every field before it’s saved.
          </p>
        </div>
      </div>

      <Card className="gap-0">
        <CardHeader className="border-b border-border/70 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-muted text-primary"><ScanText className="size-5" /></span>
            <div>
              <CardTitle>Upload your estimate</CardTitle>
              <CardDescription className="mt-1">PDF files up to 10 MB. Scanned documents may take a little longer.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5 pt-5">
          <PdfUploadForm />
          <div className="flex items-start gap-2.5 rounded-xl border border-border/80 bg-muted/45 p-3.5 text-xs leading-relaxed text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            Details are extracted for your review—not saved as a quote until you confirm them. AI extraction must be configured for this workspace to process scanned PDFs.
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <Link href="/quotes/new" className="font-semibold text-primary hover:underline">Enter quote manually</Link>
        <Link href="/quotes" className="font-medium text-muted-foreground hover:text-primary">Back to quotes</Link>
      </div>
    </div>
  );
}
