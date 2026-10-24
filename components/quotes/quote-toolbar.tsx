"use client";

import { useState, useTransition } from "react";
import { Copy, Download, ExternalLink, LayoutTemplate } from "lucide-react";
import { toast } from "sonner";

import { duplicateQuoteAction } from "@/lib/actions/quotes";
import { saveQuoteAsTemplateAction } from "@/lib/actions/quoting";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function QuoteToolbar({
  quoteId,
  publicToken,
  defaultTemplateName,
}: {
  quoteId: string;
  publicToken: string | null;
  defaultTemplateName: string;
}) {
  const [pending, startTransition] = useTransition();
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState(defaultTemplateName);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button asChild variant="outline" size="sm" className="gap-1.5">
        <a href={`/api/quotes/${quoteId}/pdf`} target="_blank" rel="noopener"><Download className="size-3.5" /> PDF</a>
      </Button>
      {publicToken ? (
        <Button asChild variant="outline" size="sm" className="gap-1.5">
          <a href={`/q/${publicToken}`} target="_blank" rel="noopener"><ExternalLink className="size-3.5" /> Customer view</a>
        </Button>
      ) : null}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const result = await duplicateQuoteAction(quoteId);
            if (result?.error) toast.error(result.error);
          })
        }
      >
        <Copy className="size-3.5" /> {pending && !naming ? "Duplicating…" : "Duplicate"}
      </Button>
      {naming ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            startTransition(async () => {
              const result = await saveQuoteAsTemplateAction(quoteId, name);
              if (result.error) {
                toast.error(result.error);
                return;
              }
              toast.success(`Saved template "${name.trim()}".`);
              setNaming(false);
            });
          }}
        >
          <Input
            aria-label="Template name"
            value={name}
            maxLength={100}
            onChange={(event) => setName(event.target.value)}
            className="h-7 w-48 text-sm"
            autoFocus
          />
          <Button type="submit" size="sm" disabled={pending}>Save</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setNaming(false)}>Cancel</Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setNaming(true)}>
          <LayoutTemplate className="size-3.5" /> Save as template
        </Button>
      )}
    </div>
  );
}
