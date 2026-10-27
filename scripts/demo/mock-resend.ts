/**
 * A stand-in for the Resend API so the demo can send quotes and follow-ups
 * without any email leaving the machine. Point the app at it with
 * RESEND_BASE_URL=http://localhost:3101 and any RESEND_API_KEY.
 *
 *   npx tsx scripts/demo/mock-resend.ts
 */
import { randomUUID } from "crypto";
import { createServer } from "http";

const PORT = Number(process.env.MOCK_RESEND_PORT ?? 3101);

createServer((request, response) => {
  let body = "";
  request.on("data", (chunk) => (body += chunk));
  request.on("end", () => {
    if (request.method === "POST" && request.url?.startsWith("/emails")) {
      const email = JSON.parse(body || "{}") as { to?: unknown; subject?: string };
      console.log(`[mock-resend] ${String(email.to)} — ${email.subject}`);
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ id: `demo_${randomUUID()}`, object: "email" }));
  });
}).listen(PORT, () => console.log(`Mock Resend listening on http://localhost:${PORT}`));
