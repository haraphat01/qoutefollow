import { History } from "lucide-react";

export function formatDateTime(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

/** `status_changed` → `Status changed`, `user.banned` → `User banned`. */
export function humanizeAction(action: string) {
  const text = action.replace(/[._]/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Activity metadata is stored as JSON; show it as short `key: value` pairs. */
function describeMetadata(metadata: string | null) {
  if (!metadata) {
    return null;
  }
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (parsed && typeof parsed === "object") {
      return Object.entries(parsed as Record<string, unknown>)
        .map(([key, value]) => `${key}: ${typeof value === "object" ? JSON.stringify(value) : String(value)}`)
        .join(" · ");
    }
  } catch {
    // Not JSON; show as-is.
  }
  return metadata;
}

export function ActivityList({
  items,
}: {
  items: {
    id: string;
    entityType: string;
    action: string;
    metadata: string | null;
    createdAt: Date;
    userName?: string | null;
  }[];
}) {
  if (items.length === 0) {
    return (
      <div className="empty-state min-h-40">
        <span className="empty-state-icon"><History className="size-5" /></span>
        <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border rounded-xl border border-border/80">
      {items.map((item) => {
        const details = describeMetadata(item.metadata);
        return (
          <li key={item.id} className="flex flex-wrap items-start justify-between gap-2 px-4 py-3 text-sm">
            <div className="min-w-0">
              <p className="font-medium">
                <span className="capitalize">{item.entityType}</span>: {humanizeAction(item.action).toLowerCase()}
                {item.userName !== undefined ? (
                  <span className="font-normal text-muted-foreground"> by {item.userName ?? "a deleted user or the system"}</span>
                ) : null}
              </p>
              {details ? (
                <p className="mt-0.5 break-words text-xs text-muted-foreground">{details}</p>
              ) : null}
            </div>
            <time className="shrink-0 text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</time>
          </li>
        );
      })}
    </ul>
  );
}
