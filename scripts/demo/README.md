# Homepage demo video

`public/demo/quotefollow-demo.{mp4,webm}` (about 2 minutes, with music) and
its poster are recorded from the real app with Playwright. Re-run this after
UI changes instead of editing the video by hand.

## What it does

1. `seed.ts` fills a **local** database with a demo roofing workspace (Lone
   Star Roofing & Exteriors): quotes, a teammate, a price book, templates and
   two follow-up sequences. It refuses any non-localhost database.
2. `record.ts` signs in off camera and walks through every feature: dashboard,
   a Good/Better/Best quote from a template and the price book, emailing it,
   sending a follow-up early, assigning it and an @mention note, the customer
   choosing an option and signing, PDF import, a reply pausing follow-ups,
   customers, filters and CSV export, reports, sequences, branding and
   settings, and inviting a teammate. It draws a cursor and captions into the
   page and saves screencast frames.
3. `render.ts` cuts the scenes, crossfades them, adds music and encodes the
   MP4, WebM and poster into `public/demo/` (needs `ffmpeg`).

`mock-resend.ts` stands in for the Resend API, so quotes, follow-ups and
invites "send" without any email leaving your machine.

## Music

`make-music.ts` synthesizes an original instrumental, so there is nothing to
license. To use a track you have the rights to instead:

```bash
DEMO_MUSIC=path/to/track.mp3 npm run demo:render
```

## Running it

Needs Postgres and ffmpeg (`brew install postgresql@16 ffmpeg`) and the
Playwright browser (`npx playwright install chromium`).

```bash
createdb qoutefollow_demo
export DEMO_DATABASE_URL=postgres://localhost:5432/qoutefollow_demo
DATABASE_URL=$DEMO_DATABASE_URL npx drizzle-kit push

# Terminal 1: the stand-in email API.
npm run demo:mock-email

# Terminal 2: build and serve the app against the demo database, with email
# pointed at the stand-in and Stripe and AI switched off. NEXT_DIST_DIR keeps
# this build out of .next, so it can run next to `next dev`. Production mode
# keeps the Next.js dev badge out of the video.
export DATABASE_URL=$DEMO_DATABASE_URL RESEND_API_KEY=re_demo \
  RESEND_BASE_URL=http://localhost:3101 \
  EMAIL_FROM="QuoteFollow <quotes@lonestar-roofing.example>" \
  STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET= OPENAI_API_KEY= BLOB_READ_WRITE_TOKEN= \
  NEXT_PUBLIC_APP_URL=http://localhost:3100 NEXT_DIST_DIR=.next-demo
npx next build && npx next start -p 3100

# Terminal 3:
npm run demo:video
```

Raw frames land in `scripts/demo/out/` (git-ignored). To change the story,
edit the scenes and captions in `record.ts`; keep the total under two minutes.
