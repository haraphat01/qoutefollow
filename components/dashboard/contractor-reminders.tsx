import Link from "next/link";
import { ArrowUpRight, BellRing } from "lucide-react";

import type { ContractorReminder } from "@/lib/queries/reminders";

export function ContractorReminders({ items }: { items: ContractorReminder[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state min-h-40">
        <span className="empty-state-icon">
          <BellRing className="size-5" />
        </span>
        <h3 className="mt-4 text-sm font-semibold">You&apos;re caught up</h3>
        <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">
          No manual follow-ups flagged right now. We&apos;ll nudge you when a
          quote goes quiet or automation finishes.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border/70">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 py-4 first:pt-2 last:pb-1"
        >
          <div>
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </div>
          <Link
            href={`/quotes/${item.quoteId}`}
            className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            Open quote <ArrowUpRight className="size-3.5" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
