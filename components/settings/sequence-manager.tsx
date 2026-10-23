"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

import {
  createSequenceAction,
  deleteSequenceAction,
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
  const router = useRouter();

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
              <div className="flex gap-2">
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
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-muted-foreground hover:text-destructive"
                  disabled={pending}
                  onClick={() => {
                    startTransition(async () => {
                      const result = await deleteSequenceAction(sequence.id);
                      if (result.error) {
                        toast.error(result.error);
                        return;
                      }
                      toast.success(
                        `${sequence.name} deleted. Its quotes now use the default sequence.`,
                      );
                      if (sequence.id === activeSequenceId) {
                        router.push("/settings/sequences");
                      }
                    });
                  }}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set("cloneFromSequenceId", activeSequenceId);
          startTransition(async () => {
            const result = await createSequenceAction({}, formData);
            if (result.error) {
              toast.error(result.error);
              return;
            }
            toast.success("Sequence created from the one you were viewing.");
            form.reset();
            if (result.sequenceId) {
              router.push(`/settings/sequences?sequence=${result.sequenceId}`);
            }
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
