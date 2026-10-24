"use client";

import { useActionState } from "react";

import { addQuoteInternalNoteAction } from "@/lib/actions/quote-notes";
import type { ActionState } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/format";

type NoteRow = {
  id: string;
  body: string;
  authorName: string;
  createdAt: Date;
};

const initialState: ActionState = {};

export function QuoteInternalNotes({
  quoteId,
  notes,
  memberHint,
  timeZone,
}: {
  quoteId: string;
  notes: NoteRow[];
  memberHint: string;
  timeZone: string;
}) {
  const [state, action, pending] = useActionState(
    addQuoteInternalNoteAction,
    initialState,
  );

  return (
    <div className="space-y-4">
      <form action={action} className="space-y-3">
        <input type="hidden" name="quoteId" value={quoteId} />
        <div className="space-y-2">
          <Label htmlFor="internalNote">Add an internal note</Label>
          <Textarea
            id="internalNote"
            name="body"
            rows={3}
            placeholder="e.g. Customer asked for a callback Tuesday @Mike"
            required
          />
          <p className="text-xs text-muted-foreground">{memberHint}</p>
        </div>
        {state.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Post note"}
        </Button>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Team notes stay internal — customers never see this thread.
        </p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="rounded-xl border border-dashed border-border/80 bg-muted/40 px-4 py-3 text-sm"
            >
              <p className="text-xs font-medium text-muted-foreground">
                {note.authorName} · {formatDateTime(note.createdAt, timeZone)}
              </p>
              <p className="mt-2 whitespace-pre-wrap">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
