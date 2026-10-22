export const MAX_SEND_ATTEMPTS = 5;

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
