"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";

import { removeEmailSuppressionAction } from "@/lib/actions/deliverability";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";

const REASON_COPY: Record<string, { title: string; fix: string }> = {
  bounced: {
    title: "Hard bounce",
    fix: "Confirm the customer email, fix typos, or use another address before re-adding.",
  },
  complained: {
    title: "Spam complaint",
    fix: "Only remove if the customer asked to hear from you again.",
  },
  unsubscribed: {
    title: "Unsubscribed",
    fix: "Customer used the unsubscribe link. Do not email again without written consent.",
  },
};

export function SuppressionList({
  rows,
  isOwner,
}: {
  rows: {
    id: string;
    email: string;
    reason: string;
    createdAt: Date;
    quoteNumber: string | null;
    sourceQuoteId: string | null;
  }[];
  isOwner: boolean;
}) {
  const [pending, startTransition] = useTransition();

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No suppressed addresses. Bounces, complaints, and unsubscribes appear here
        automatically.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>Reason</TableHead>
          <TableHead>Since</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const copy = REASON_COPY[row.reason] ?? {
            title: row.reason,
            fix: "Review before removing this suppression.",
          };
          return (
            <TableRow key={row.id}>
              <TableCell className="font-medium">{row.email}</TableCell>
              <TableCell>
                <p className="text-sm font-medium">{copy.title}</p>
                <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                  {copy.fix}
                </p>
                {row.quoteNumber && row.sourceQuoteId ? (
                  <Link
                    href={`/quotes/${row.sourceQuoteId}`}
                    className="mt-1 inline-block text-xs font-semibold text-primary hover:underline"
                  >
                    From quote {row.quoteNumber}
                  </Link>
                ) : null}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDate(row.createdAt)}
              </TableCell>
              <TableCell className="text-right">
                {isOwner ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      startTransition(async () => {
                        const result = await removeEmailSuppressionAction(
                          row.id,
                        );
                        if (result.error) {
                          toast.error(result.error);
                          return;
                        }
                        toast.success("Suppression removed.");
                      });
                    }}
                  >
                    Remove
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
