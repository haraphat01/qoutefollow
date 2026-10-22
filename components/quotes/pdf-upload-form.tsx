"use client";

import { useActionState } from "react";
import { FileCheck2, ScanLine } from "lucide-react";

import { uploadPdfAction } from "@/lib/actions/pdf-import";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = {};

export function PdfUploadForm() {
  const [state, action, pending] = useActionState(uploadPdfAction, initialState);

  return (
    <form action={action} encType="multipart/form-data" className="space-y-5">
      {state.error ? (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      <div className="space-y-2">
        <Label htmlFor="file">Estimate PDF</Label>
        <Input
          id="file"
          name="file"
          type="file"
          accept="application/pdf"
          aria-describedby="pdf-upload-help"
          className="h-auto min-h-12 cursor-pointer py-2 file:mr-3 file:h-8 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:text-xs file:font-semibold file:text-secondary-foreground"
          required
        />
        <p id="pdf-upload-help" className="text-xs leading-relaxed text-muted-foreground">
          Choose one PDF file (10 MB max). Text-based estimates are read directly; scanned PDFs use OCR and AI extraction.
        </p>
      </div>
      <div className="grid gap-3 rounded-xl bg-muted/55 p-4 text-xs text-muted-foreground sm:grid-cols-2">
        <p className="flex items-start gap-2"><FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" /> Review and edit extracted details before saving.</p>
        <p className="flex items-start gap-2"><ScanLine className="mt-0.5 size-4 shrink-0 text-primary" /> Scanned pages can take longer to process.</p>
      </div>
      <Button type="submit" size="lg" className="h-11 w-full rounded-xl sm:w-auto" disabled={pending}>
        {pending ? "Uploading and extracting…" : "Upload and review"}
      </Button>
    </form>
  );
}
