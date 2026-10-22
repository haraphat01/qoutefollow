"use client";

import Link from "next/link";

import { markNotificationsReadAction } from "@/lib/actions/notifications";
import { Button } from "@/components/ui/button";

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  quoteId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

export function DashboardNotifications({
  items,
  unreadCount,
}: {
  items: NotificationRow[];
  unreadCount: number;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Customer replies and automation alerts will appear here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 ? (
        <form action={markNotificationsReadAction}>
          <Button type="submit" variant="outline" size="sm">
            Mark all read
          </Button>
        </form>
      ) : null}
      <ul className="divide-y divide-border/70">
        {items.map((item) => (
          <li key={item.id} className="py-3 first:pt-0">
            <p className="text-sm font-semibold">{item.title}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
            {item.quoteId ? (
              <Link
                href={`/quotes/${item.quoteId}`}
                className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
              >
                View quote
              </Link>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
