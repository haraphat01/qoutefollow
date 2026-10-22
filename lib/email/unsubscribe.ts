import { createHmac, timingSafeEqual } from "crypto";

type UnsubscribePayload = {
  organizationId: string;
  email: string;
  exp: number;
};

function getSecret() {
  const secret = process.env.UNSUBSCRIBE_SECRET ?? process.env.CRON_SECRET;
  if (!secret) {
    throw new Error("UNSUBSCRIBE_SECRET or CRON_SECRET must be set");
  }
  return secret;
}

function signPayload(encoded: string) {
  return createHmac("sha256", getSecret()).update(encoded).digest("base64url");
}

export function createUnsubscribeToken(input: {
  organizationId: string;
  email: string;
  ttlSeconds?: number;
}) {
  const ttlSeconds = input.ttlSeconds ?? 60 * 60 * 24 * 365;
  const payload: UnsubscribePayload = {
    organizationId: input.organizationId,
    email: input.email.toLowerCase(),
    exp: Math.floor(Date.now() / 1000) + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = signPayload(encoded);
  return `${encoded}.${signature}`;
}

export function verifyUnsubscribeToken(token: string): UnsubscribePayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) {
    return null;
  }

  const expected = signPayload(encoded);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8"),
    ) as UnsubscribePayload;

    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function unsubscribeUrl(token: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/unsubscribe?token=${encodeURIComponent(token)}`;
}
