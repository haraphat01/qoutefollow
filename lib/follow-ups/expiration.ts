const URGENCY_DAYS = 3;

export function daysUntilExpiration(expiresAt: Date | null, now = new Date()) {
  if (!expiresAt) {
    return null;
  }
  const ms = expiresAt.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

export function isPastExpiration(expiresAt: Date | null, now = new Date()) {
  if (!expiresAt) {
    return false;
  }
  return expiresAt.getTime() < now.getTime();
}

export function isExpirationUrgent(expiresAt: Date | null, now = new Date()) {
  const days = daysUntilExpiration(expiresAt, now);
  return days !== null && days >= 0 && days <= URGENCY_DAYS;
}

export function applyExpirationUrgency(input: {
  subject: string;
  body: string;
  expiresAt: Date | null;
  formatDate: (date: Date) => string;
}) {
  if (!isExpirationUrgent(input.expiresAt)) {
    return { subject: input.subject, body: input.body };
  }

  const expiresAt = input.expiresAt!;
  const label = input.formatDate(expiresAt);

  return {
    subject: `[Expires ${label}] ${input.subject}`,
    body: `This estimate expires on ${label}. If you would like to move forward, please let us know soon.\n\n${input.body}`,
  };
}
