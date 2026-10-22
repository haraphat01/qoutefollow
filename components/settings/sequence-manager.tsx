"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  createSequenceAction,
  setDefaultSequenceAction,
} from "@/lib/actions/sequences";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SequenceManager({
  sequences,
  activeSequenceId,
}: {
  sequences: {
    id: string;
    name: string;
    isDefault: boolean;
  }[];
  activeSequenceId: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <ul className="divide-y divide-border rounded-xl border border-border/80">
        {sequences.map((sequence) => (
          <li
            key={sequence.id}
            className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
          >
            <div className="flex items-center gap-2">
              <Link
                href={`/settings/sequences?sequence=${sequence.id}`}
                className={`text-sm font-semibold hover:text-primary ${
                  sequence.id === activeSequenceId ? "text-primary" : ""
                }`}
              >
                {sequence.name}
              </Link>
              {sequence.isDefault ? (
                <Badge variant="secondary">Default</Badge>
              ) : null}
            </div>
            {!sequence.isDefault ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => {
                  startTransition(async () => {
                    const result = await setDefaultSequenceAction(sequence.id);
                    if (result.error) {
                      toast.error(result.error);
                      return;
                    }
                    toast.success(`${sequence.name} is now the default.`);
                  });
                }}
              >
                Set as default
              </Button>
            ) : null}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          formData.set("cloneFromSequenceId", activeSequenceId);
          startTransition(async () => {
            const result = await createSequenceAction({}, formData);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Sequence created.");
            event.currentTarget.reset();
          });
        }}
      >
        <Input
          name="name"
          placeholder="e.g. High-ticket roof"
          className="max-w-xs"
          required
        />
        <Button type="submit" disabled={pending}>
          Add sequence
        </Button>
      </form>
    </div>
  );
}
