# QuoteFollow — production deployment (Coolify)

This guide assumes you host the **Next.js app**, **PostgreSQL**, and **background jobs** on [Coolify](https://coolify.io), with Resend and Stripe as external services.

| Component | Host |
| --- | --- |
| Next.js app | Coolify (Docker / Nixpacks) |
| PostgreSQL | Coolify database service |
| Follow-up email worker | Coolify **scheduled task** (`npm run worker:follow-ups`) |
| PDF files | Persistent volume on the app container (`storage/uploads/`) |
| Email | [Resend](https://resend.com) |
| Billing | [Stripe](https://stripe.com) |

---

## 1. Architecture

```text
Contractor browser
       │
       ▼
  Coolify (Next.js, port 3000)
       │
       ├── PostgreSQL (Coolify, private network)
       ├── Persistent volume → /app/storage/uploads  (PDFs)
       ├── Resend (outbound + inbound webhooks)
       ├── Stripe (Checkout + Portal + webhooks)
       └── Scheduled task (every 5–15 min)
            └── npm run worker:follow-ups
```

The worker runs the same logic as `GET /api/cron/follow-ups` but calls `processDueFollowUps` directly (no HTTP). Use **either** the scheduled worker **or** a Coolify job that curls the cron route—not both on the same schedule.

---

## 2. Prerequisites

- Git repository (GitHub / GitLab / Gitea) connected to Coolify
- Domain pointing at your Coolify server (e.g. `app.quotefollow.com`)
- Verified sending domain in Resend (`EMAIL_FROM`)
- Stripe account with Starter price ($39/mo)
- Coolify server with enough disk for Postgres + PDF volume

---

## 3. PostgreSQL on Coolify

1. Create a **PostgreSQL** database in Coolify.
2. Copy the internal connection string → `DATABASE_URL`  
   Example: `postgres://user:pass@coolify-db:5432/qoutefollow`
3. Apply schema (from your laptop or Coolify “Execute command” on the app):

```bash
npm ci
npm run db:push
```

Prefer migrations in production:

```bash
npm run db:generate
npm run db:migrate
```

Keep the database on Coolify’s **private network**; do not expose Postgres to the public internet.

---

## 4. Deploy the Next.js app on Coolify

1. **New resource → Application** → connect your Git repo.
2. **Build pack**: Nixpacks (or Dockerfile if you add one). Coolify should detect Next.js.
3. **Build command**: `npm ci && npm run build`
4. **Start command**: `npm run start` (default port **3000**).
5. **Environment variables** — add everything from `.env.example` (see table below).
6. **Domains** — attach your domain; enable HTTPS (Coolify / Traefik).
7. Set `NEXT_PUBLIC_APP_URL` to the canonical URL, e.g. `https://app.quotefollow.com` (no trailing slash).

### Persistent storage for PDF uploads

PDF import writes to `storage/uploads/` under the project root. On Coolify you **must** mount a persistent volume so redeploys do not wipe files.

1. In the application → **Storages** (or **Volumes**), add a mount:
   - **Container path**: `/app/storage/uploads` (adjust if your workdir differs; Nixpacks often uses `/app`)
   - **Volume**: create a new named volume, e.g. `qoutefollow-uploads`
2. Redeploy after adding the volume.

You do **not** need `BLOB_READ_WRITE_TOKEN` on Coolify unless you prefer external object storage (optional Vercel Blob or S3-compatible store—the app supports Blob when that token is set).

### Health check

Optional: HTTP GET `/` or `/login` on port 3000.

---

## 5. Environment variables

Set these on the **Coolify application** (and on the **scheduled worker** resource—same values).

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Coolify Postgres URL (internal hostname) |
| `NEXT_PUBLIC_APP_URL` | Yes | Public HTTPS URL of the app |
| `CRON_SECRET` | Yes | Random string; only needed if you use HTTP cron instead of the worker |
| `RESEND_API_KEY` | Yes | Outbound follow-up email |
| `EMAIL_FROM` | Yes | Address on your verified Resend domain |
| `RESEND_WEBHOOK_SECRET` | Recommended | Resend webhook signing secret |
| `OPENAI_API_KEY` | Recommended | PDF import + inbound reply classification |
| `UNSUBSCRIBE_SECRET` | Recommended | Defaults to `CRON_SECRET` if unset |
| `ADMIN_EMAILS` | Optional | Comma-separated emails that can open `/admin` (platform admin) |
| `STRIPE_SECRET_KEY` | For billing | Live key in production |
| `STRIPE_WEBHOOK_SECRET` | For billing | Stripe webhook signing secret |
| `STRIPE_PRICE_STARTER` | For billing | Price ID ($39/mo) |
| `STRIPE_PORTAL_CONFIGURATION_ID` | Optional | Customer Portal config (`bpc_…`) |
| `FOLLOW_UP_BATCH_SIZE` | Optional | Default `50` per worker run |
| `BLOB_READ_WRITE_TOKEN` | Optional | External Blob storage; skip on Coolify if using a volume |

If `STRIPE_SECRET_KEY` is unset, the app runs in **pilot mode** (all features, no checkout).

---

## 6. Follow-up worker (scheduled task)

1. In Coolify, create a **Scheduled Task** (or separate **Application** that only runs on a schedule).
2. Use the **same Git repo** and **same environment variables** as the web app (at minimum `DATABASE_URL`, `RESEND_*`, `EMAIL_FROM`, `OPENAI_*` if needed).
3. **Schedule**: every 5–15 minutes, e.g. `*/15 * * * *`
4. **Command**:

```bash
npm ci && npm run worker:follow-ups
```

5. Working directory should be the app root (where `package.json` lives).

### Alternative: HTTP cron

If you prefer hitting the API route from Coolify’s scheduler:

```bash
curl -fsS -H "Authorization: Bearer $CRON_SECRET" \
  "$NEXT_PUBLIC_APP_URL/api/cron/follow-ups"
```

Store `CRON_SECRET` in the scheduled task env. Do **not** run this and `worker:follow-ups` on the same interval.

---

## 7. Trust, compliance & deliverability (in-app)

The platform admin checks **Admin → Platform**: the email setup checklist (Resend key, branded domain, webhooks, secrets, reply tracking) and the Resend domain DNS steps.

Each workspace owner then opens **Settings** in QuoteFollow and fills in the **Business profile** (contact details, logo and the **mailing address** required by CAN-SPAM; a banner shows until it's set). Unsubscribes and bounces are listed under **Settings → Unsubscribed customers**.

Each quote detail page includes an **Email audit trail** (sent, delivered, bounced, etc.).

---

## 8. Resend

### Outbound

- Verify your domain in Resend.
- Set `EMAIL_FROM` to an address on that domain.

### Webhooks (bounces, replies)

1. Endpoint: `https://app.yourdomain.com/api/webhooks/resend`
2. Events: `email.delivered`, `email.bounced`, `email.complained`, `email.received` (inbound needs Resend Inbound on your domain).

### Account & team emails

With `RESEND_API_KEY` set, QuoteFollow also sends:

| Email | Trigger |
| --- | --- |
| Confirm your email | Signup (the workspace stays locked until the link is clicked; link valid 24 h) |
| Welcome | After a new owner confirms their email |
| Reset your password | "Forgot password?" on the sign-in page (link valid 1 h, single use) |
| Team invite | Owner adds a teammate under Settings → Team (teammate sets their own password; link valid 7 days) |
| Customer replied | Inbound customer reply — sent to every teammate (the reply-to address gets the full forward instead) |
| Mentioned you | Someone @mentions a teammate in a quote's team notes |

Links in these emails use `NEXT_PUBLIC_APP_URL`, which Next.js bakes in **at build time** — set it in Coolify before building, then redeploy if you change it.

Without `RESEND_API_KEY`, email verification is not enforced and teammates are added with a temporary password instead of an invite email. Accounts that existed before verification was added are treated as verified.

### Reply detection (inbound)

1. In Resend, enable **Inbound** on a dedicated domain or subdomain (e.g. `reply.yourdomain.com`) and add the MX record it gives you.
2. Set `INBOUND_REPLY_DOMAIN=reply.yourdomain.com`.
3. Follow-ups then use `Reply-To: reply+<quoteId>@reply.yourdomain.com`. When a customer replies, the quote is paused, the reply shows on the quote, and a copy is forwarded to the organization's reply-to email.

Without `INBOUND_REPLY_DOMAIN`, replies go straight to the organization's reply-to email and QuoteFollow cannot pause automation automatically.
3. Signing secret → `RESEND_WEBHOOK_SECRET`.

---

## Quotes customers can accept online

- Every sent quote links to `/q/<token>`, a public page where the customer compares Good/Better/Best options, downloads the PDF, and accepts by typing their name. Acceptance records name, time, IP and browser, stops follow-ups, alerts owners and the assignee, and emails the customer a signed PDF.
- Quote emails attach a PDF; follow-ups link to the online quote. Uploaded logos (Settings → Business profile) appear on both and are served from `/api/logo/<orgId>`.
- **Email opens and clicks:** in Resend, open **Domains → your domain → Configuration** and turn on open and click tracking (Resend asks for a tracking subdomain). The webhook already listens for `email.opened` and `email.clicked`. Online quote views are tracked without this.
- **Weekly summary:** the follow-up worker (or the cron route) also sends each workspace's owners a summary on Monday from 8am in its send time zone. Owners can switch it off or send a preview under Settings → Sending.
- Exports: `/api/export/quotes` and `/api/export/customers` (signed-in members only).

## Platform admin

Users whose email is in `ADMIN_EMAILS` see an **Admin** item in the sidebar (`/admin`); everyone else gets a 404 there. From it you can:

- Browse and search every user and workspace, with each one's quotes and activity.
- **Ban** a user (signs them out and blocks sign-in and password resets), optionally suspending the workspace they own. **Unban** reverses it.
- **Suspend** a workspace: every member is signed out, sign-in is blocked, and queued follow-ups wait until the suspension is lifted.
- **Delete** a user. A sole owner's workspace is deleted with them; otherwise the next teammate becomes owner. **Delete workspace** removes all its member logins, data and PDFs and cancels its Stripe subscription.
- Stop follow-ups or delete individual quotes, or stop every follow-up in a workspace.

Admins can't ban, suspend or delete themselves or another admin. Every action is recorded under **Admin log**.

---

## 9. Stripe

- One recurring monthly price → `STRIPE_PRICE_STARTER` ($39/mo).
- [Customer Portal](https://dashboard.stripe.com/settings/billing/portal) → `STRIPE_PORTAL_CONFIGURATION_ID`.
- Webhook: `https://app.yourdomain.com/api/webhooks/stripe`  
  Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`

---

## 10. Post-deploy checklist

- [ ] `npm run db:push` (or migrate) against production DB
- [ ] PDF volume mounted at `storage/uploads`
- [ ] Scheduled worker running; logs show `{ "sent": … }`
- [ ] Register test org; create quote → approve → `scheduled_follow_ups` populated
- [ ] Stripe test checkout → `/settings/billing` updates
- [ ] Resend webhooks reachable from the internet
- [ ] Two orgs: no cross-tenant data leak
- [ ] `npm test` in CI before release

---

## 11. CI suggestion (GitHub Actions)

```yaml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
        env:
          DATABASE_URL: postgres://placeholder:placeholder@localhost:5432/placeholder
```

---

## 12. Security

- Rotate `CRON_SECRET`, `UNSUBSCRIBE_SECRET`, and webhook secrets if leaked.
- Never commit `.env.local`.
- Stripe / Resend **live** keys only on production.
- Postgres and PDF volume not publicly exposed.

---

## 13. Troubleshooting

| Symptom | Likely cause |
| --- | --- |
| 500 on login/dashboard | Wrong `DATABASE_URL` or schema not pushed |
| Follow-ups never send | Worker not scheduled; missing `RESEND_API_KEY`; quote not `pending` / not `contactConfirmed` |
| Stripe plan stuck | Webhook URL unreachable or wrong `STRIPE_WEBHOOK_SECRET` |
| PDF missing after redeploy | No persistent volume on `storage/uploads` |
| Unsubscribe links broken | Wrong `NEXT_PUBLIC_APP_URL` |

---

## 14. Local stack (optional)

```bash
docker compose up -d   # Postgres only
npm run db:push
npm run dev
```

For a local production smoke test: `npm run build && npm start`.

---

## Appendix: Vercel (not used in this setup)

`vercel.json` defines a Vercel Cron for `/api/cron/follow-ups`. Ignore it on Coolify. Optional `BLOB_READ_WRITE_TOKEN` targets Vercel Blob; on Coolify, use a **volume mount** instead.
