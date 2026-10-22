export const MAX_SEND_ATTEMPTS = 5;

/** Reclaim rows stuck in `processing` longer than this (e.g. crashed worker). */
export const PROCESSING_LOCK_MAX_AGE_MS = 15 * 60 * 1000;

export function isRetryableError(message: string) {
  const lower = message.toLowerCase();
  return (
    lower.includes("timeout") ||
    lower.includes("rate") ||
    lower.includes("temporar") ||
    lower.includes("503") ||
    lower.includes("502") ||
    lower.includes("429")
  );
}

export function nextRetryDate(attemptCount: number) {
  const minutes = Math.min(60, 2 ** attemptCount);
  return new Date(Date.now() + minutes * 60 * 1000);
}
