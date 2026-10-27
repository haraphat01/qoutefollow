/**
 * Records the homepage demo video by driving the real app with Playwright.
 * Run `npm run demo:video`, which seeds the demo database first; see
 * scripts/demo/README.md.
 *
 * Captures each clip as timestamped screencast frames (sharper than
 * Playwright's built-in video) plus scenes.json, the scene start/end times,
 * into scripts/demo/out/. scripts/demo/render.ts cuts and joins them.
 */
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { chromium, type BrowserContext, type CDPSession, type Locator, type Page } from "playwright";

import { DEMO_EMAIL, DEMO_PASSWORD } from "./constants";

const BASE = process.env.DEMO_BASE_URL ?? "http://localhost:3100";
const OUT = path.join(__dirname, "out");
const ESTIMATE_PDF = path.join(OUT, "estimate.pdf");
const SIZE = { width: 1440, height: 900 };

/** Scene times are epoch seconds, matching the screencast frame timestamps. */
type Scene = { clip: string; start: number; end: number };
const scenes: Scene[] = [];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Fake cursor and caption bar; the headless browser draws neither. */
function overlayScript() {
  const install = () => {
    if (document.getElementById("demo-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `
      #demo-cursor { position: fixed; z-index: 2147483647; left: 0; top: 0; width: 22px; height: 22px; pointer-events: none; transform: translate(-100px, -100px); transition: none; filter: drop-shadow(0 2px 3px rgba(0,0,0,.25)); }
      #demo-cursor.down::after { content: ""; position: absolute; left: -14px; top: -14px; width: 28px; height: 28px; border-radius: 999px; background: rgba(40,87,66,.28); animation: demo-ripple .45s ease-out forwards; }
      @keyframes demo-ripple { from { transform: scale(.4); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
      #demo-caption { position: fixed; z-index: 2147483646; left: 50%; bottom: 36px; transform: translate(-50%, 12px); opacity: 0; pointer-events: none; white-space: nowrap; padding: 16px 30px; border-radius: 18px; background: rgba(22,48,37,.94); color: #fff; font: 600 32px/1.25 ui-sans-serif, system-ui, -apple-system, sans-serif; letter-spacing: -.01em; text-align: center; box-shadow: 0 18px 50px -12px rgba(15,35,27,.55); transition: opacity .35s ease, transform .35s ease; }
      #demo-caption.on { opacity: 1; transform: translate(-50%, 0); }
      html { scroll-behavior: auto !important; }
    `;
    document.head.appendChild(style);
    const cursor = document.createElement("div");
    cursor.id = "demo-cursor";
    cursor.innerHTML = `<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 2l15 11.5-6.6 1.1 3.9 7.4-2.9 1.5-3.9-7.5L4 20.5z" fill="#fff" stroke="#16302a" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
    document.body.appendChild(cursor);
    const caption = document.createElement("div");
    caption.id = "demo-caption";
    document.body.appendChild(caption);

    const pos = JSON.parse(sessionStorage.getItem("demo-pos") ?? "[-100,-100]");
    cursor.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`;
    window.addEventListener("mousemove", (event) => {
      cursor.style.transform = `translate(${event.clientX}px, ${event.clientY}px)`;
      sessionStorage.setItem("demo-pos", JSON.stringify([event.clientX, event.clientY]));
    }, true);
    window.addEventListener("mousedown", () => {
      cursor.classList.remove("down");
      void cursor.offsetWidth;
      cursor.classList.add("down");
    }, true);

    const show = (text: string) => {
      caption.textContent = text;
      caption.classList.toggle("on", Boolean(text));
    };
    show(sessionStorage.getItem("demo-caption") ?? "");
    (window as unknown as { __demoCaption: (t: string) => void }).__demoCaption = (text) => {
      sessionStorage.setItem("demo-caption", text);
      show(text);
    };
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install);
  } else {
    install();
  }
}

class Director {
  private mouse = { x: SIZE.width / 2, y: SIZE.height / 2 };
  private sceneStart = 0;

  constructor(
    readonly page: Page,
    private readonly clip: string,
  ) {}

  private now() {
    return Date.now() / 1000;
  }

  begin() {
    this.sceneStart = this.now();
  }

  end() {
    scenes.push({ clip: this.clip, start: this.sceneStart, end: this.now() });
  }

  async caption(text: string) {
    await this.page.evaluate((t) => (window as unknown as { __demoCaption: (t: string) => void }).__demoCaption(t), text);
  }

  async goto(url: string) {
    await this.page.goto(BASE + url, { waitUntil: "networkidle" });
    await this.page.waitForFunction(() => document.getElementById("demo-caption"));
  }

  /** Eased mouse movement, so the cursor glides instead of jumping. */
  async moveTo(x: number, y: number, ms = 700) {
    const from = { ...this.mouse };
    const frames = Math.max(8, Math.round(ms / 16));
    for (let i = 1; i <= frames; i++) {
      const t = i / frames;
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      await this.page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await wait(ms / frames);
    }
    this.mouse = { x, y };
  }

  async hover(target: Locator, ms = 700) {
    await target.scrollIntoViewIfNeeded();
    const box = await target.boundingBox();
    if (!box) throw new Error("Target is not visible");
    await this.moveTo(box.x + Math.min(box.width / 2, 60), box.y + box.height / 2, ms);
  }

  async click(target: Locator) {
    await this.hover(target);
    await wait(180);
    await this.page.mouse.down();
    await wait(90);
    await this.page.mouse.up();
  }

  async type(target: Locator, text: string) {
    await this.click(target);
    await target.pressSequentially(text, { delay: 45 });
  }

  /** Eased scroll of the window to a target position. */
  async scrollTo(y: number, ms = 1200) {
    await this.page.evaluate(
      ([to, duration]) =>
        new Promise<void>((resolve) => {
          const from = window.scrollY;
          const start = performance.now();
          const step = (now: number) => {
            const t = Math.min(1, (now - start) / duration);
            const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            window.scrollTo(0, from + (to - from) * e);
            if (t < 1) requestAnimationFrame(step);
            else resolve();
          };
          requestAnimationFrame(step);
        }),
      [y, ms] as const,
    );
  }

  /** Scroll so the target sits near the top of the viewport. */
  async scrollToElement(target: Locator, offset = 120, ms = 1200) {
    const top = await target.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    await this.scrollTo(Math.max(0, top - offset), ms);
  }
}

async function recordingContext(
  browser: Awaited<ReturnType<typeof chromium.launch>>,
  clip: string,
  options: { storageState?: string; extraHTTPHeaders?: Record<string, string> } = {},
) {
  const context = await browser.newContext({ viewport: SIZE, deviceScaleFactor: 1, ...options });
  // Keep demo traffic out of the site's analytics.
  await context.route(/traks-collect/, (route) => route.abort());
  // tsx wraps named functions in __name(), which doesn't exist in the page.
  await context.addInitScript({ content: "globalThis.__name = (fn) => fn;" });
  await context.addInitScript(overlayScript);
  const page = await context.newPage();

  // Chrome sends a frame whenever the page repaints; each is saved under its
  // timestamp so render.ts can rebuild real-time playback.
  const frames = path.join(OUT, clip);
  mkdirSync(frames, { recursive: true });
  const cdp = await context.newCDPSession(page);
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    writeFileSync(path.join(frames, `${metadata.timestamp!.toFixed(3)}.jpg`), Buffer.from(data, "base64"));
    await cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => undefined);
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: SIZE.width, maxHeight: SIZE.height });
  return { context, cdp, director: new Director(page, clip) };
}

async function finishClip(context: BrowserContext, cdp: CDPSession) {
  await cdp.send("Page.stopScreencast");
  await context.close();
}

/** A logo for the branding scene, drawn by the browser so no image tools are needed. */
async function makeLogo(browser: Awaited<ReturnType<typeof chromium.launch>>, file: string) {
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  await page.setContent(`<div id="logo" style="display:inline-flex;align-items:center;gap:14px;padding:14px 22px 14px 14px;font:800 30px/1 ui-sans-serif,system-ui,-apple-system,sans-serif;color:#7a2e12;letter-spacing:-.02em">
    <svg width="56" height="56" viewBox="0 0 56 56"><rect width="56" height="56" rx="14" fill="#c2410c"/><path d="M11 33 28 18l17 15" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 28l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill="#fde68a"/></svg>
    <span>LONE STAR<br><span style="font-weight:600;font-size:16px;letter-spacing:.14em;color:#9a3412">ROOFING &amp; EXTERIORS</span></span></div>`);
  await page.locator("#logo").screenshot({ path: file, omitBackground: true });
  await page.close();
}

async function main() {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const { execFileSync } = await import("child_process");
  execFileSync("npx", ["tsx", path.join(__dirname, "make-estimate-pdf.ts"), ESTIMATE_PDF], { stdio: "inherit" });

  const browser = await chromium.launch();
  const logo = path.join(OUT, "logo.png");
  await makeLogo(browser, logo);

  // Sign in off camera.
  const auth = path.join(OUT, "auth.json");
  {
    const context = await browser.newContext({ viewport: SIZE });
    const page = await context.newPage();
    await page.goto(BASE + "/login", { waitUntil: "networkidle" });
    await page.fill("#email", DEMO_EMAIL);
    await page.fill("#password", DEMO_PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/dashboard/);
    await context.storageState({ path: auth });
    await context.close();
  }

  // Clip 1: the contractor writes and sends a quote.
  let quoteUrl: string;
  let publicUrl: string;
  {
    const { context, cdp, director: d } = await recordingContext(browser, "contractor", { storageState: auth });
    const page = d.page;
    page.on("dialog", (dialog) => dialog.accept());
    await d.goto("/dashboard");
    await wait(400);

    d.begin();
    await d.caption("Your whole quote pipeline, at a glance.");
    await d.moveTo(700, 300, 800);
    await wait(1500);
    await d.scrollToElement(page.getByText("Upcoming follow-ups", { exact: true }), 120, 1200);
    await wait(900);

    await d.caption("Start from a template: Good, Better, Best in one click.");
    await d.scrollTo(0, 500);
    await d.click(page.getByRole("link", { name: "Add a quote" }).first());
    await page.waitForURL(/\/quotes\/new$/);
    await page.waitForLoadState("networkidle");
    await wait(300);
    await d.hover(page.locator("#templateId"));
    await page.locator("#templateId").selectOption({ label: "Roof replacement — Good / Better / Best" });
    await wait(700);
    await d.scrollToElement(page.getByText("Pricing", { exact: true }), 110, 1300);
    await wait(1400);
    const tab = (name: string) => page.getByRole("button", { name, exact: true });
    if (await tab("Best").count()) {
      await d.click(tab("Best"));
      await wait(900);
    }

    await d.caption("Add saved items from your price book.");
    const priceBook = page.locator("select").filter({ hasText: "From price book" }).first();
    await d.hover(priceBook);
    await priceBook.selectOption({ label: (await priceBook.locator("option", { hasText: "Skylight" }).textContent())! });
    await wait(1500);

    await d.caption("Email it with a PDF and a link to accept online.");
    await d.scrollToElement(page.locator("#customerName"), 200, 900);
    await d.type(page.locator("#customerName"), "Maria Delgado");
    await d.type(page.locator("#customerEmail"), "maria.delgado@example.com");
    await d.scrollToElement(page.locator("#sendNow"), 300, 1200);
    await d.hover(page.locator("#sendNow"));
    await wait(700);
    await d.click(page.getByRole("button", { name: "Save quote" }));
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}(\?.*)?$/);
    await page.waitForLoadState("networkidle");
    quoteUrl = new URL(page.url()).pathname;
    publicUrl = (await page.getByRole("link", { name: "Customer view" }).getAttribute("href"))!;

    await d.caption("Follow-ups go out on their own. Send one early anytime.");
    await wait(900);
    const sendNow = page.getByRole("button", { name: "Send next follow-up now" });
    await d.scrollToElement(page.getByText("Follow-up actions", { exact: true }), 260, 1000);
    await d.click(sendNow);
    await page.waitForLoadState("networkidle");
    await wait(1800);

    await d.caption("Assign quotes and loop in your team with @mentions.");
    const assignee = page.locator("select").filter({ hasText: "Jamie Cole" }).first();
    await d.scrollToElement(assignee, 300, 900);
    await d.hover(assignee);
    await assignee.selectOption({ label: "Jamie Cole" });
    await wait(700);
    const note = page.getByPlaceholder(/Customer asked for a callback/);
    await d.scrollToElement(note, 320, 1100);
    await d.type(note, "@Jamie can you call Maria Thursday about the skylight?");
    await d.click(page.getByRole("button", { name: "Post note" }));
    await page.waitForLoadState("networkidle");
    await wait(1600);
    d.end();
    await finishClip(context, cdp);
  }

  // Clip 2: the customer compares the options and signs.
  {
    const { context, cdp, director: d } = await recordingContext(browser, "customer", {
      // The signed quote shows the signer's IP; use a documentation address, not ::1.
      extraHTTPHeaders: { "x-real-ip": "203.0.113.24" },
    });
    const page = d.page;
    await d.goto(publicUrl);
    await wait(400);

    d.begin();
    await d.caption("Customers compare options and sign online.");
    await d.moveTo(500, 400, 800);
    await wait(1200);
    const better = page.locator("label").filter({ hasText: "Better" }).first();
    await d.click(better);
    await wait(900);
    await d.type(page.locator("#signerName"), "Maria Delgado");
    await d.click(page.locator('input[name="agree"]'));
    await wait(400);
    await d.click(page.getByRole("button", { name: "Accept & sign" }));
    await page.waitForLoadState("networkidle");
    await wait(2200);
    d.end();
    await finishClip(context, cdp);
  }

  // Clip 3: everything after the signature.
  {
    const { context, cdp, director: d } = await recordingContext(browser, "results", { storageState: auth });
    const page = d.page;
    page.on("dialog", (dialog) => dialog.accept());
    await d.goto(quoteUrl);
    await wait(400);

    d.begin();
    await d.caption("Signed, and the follow-ups stop on their own.");
    await d.moveTo(1100, 140, 800);
    await d.hover(page.getByRole("strong").filter({ hasText: "Accepted online" }), 800);
    await wait(2200);
    d.end();

    await d.goto("/quotes/import");
    await wait(300);
    d.begin();
    await d.caption("Got a PDF estimate? Drop it in.");
    await d.hover(page.locator('input[type="file"]'), 700);
    await page.setInputFiles('input[type="file"]', ESTIMATE_PDF);
    await wait(600);
    await d.click(page.getByRole("button", { name: "Upload and review" }));
    await page.waitForURL(/\/quotes\/import\/.+/);
    await page.waitForLoadState("networkidle");
    await d.caption("The customer, line items and total fill themselves in.");
    await wait(900);
    await d.scrollToElement(page.getByText("Pricing", { exact: true }), 90, 1400);
    await wait(1300);
    await d.scrollToElement(page.locator("#jobDescription"), 220, 800);
    await d.type(page.locator("#jobDescription"), "Full roof replacement — 30 squares");
    await d.scrollToElement(page.locator("#status"), 260, 1100);
    await d.click(page.locator("#contactConfirmed"));
    await d.click(page.getByRole("button", { name: "Confirm and save quote" }));
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}(\?.*)?$/);
    await page.waitForLoadState("networkidle");
    await wait(900);
    d.end();

    await d.goto("/dashboard");
    await wait(300);
    d.begin();
    await d.caption("A reply pauses follow-ups, with a quick summary.");
    const replyAlert = page.locator("li").filter({ has: page.getByText(/^Customer replied on/) });
    await d.scrollToElement(replyAlert, 260, 1000);
    await wait(500);
    await d.click(replyAlert.getByRole("link", { name: "View quote" }));
    await page.waitForURL(/\/quotes\/[0-9a-f-]{36}(\?.*)?$/);
    await page.waitForLoadState("networkidle");
    await d.hover(page.getByText("Reply intelligence"), 700);
    await wait(1200);
    await d.click(page.getByRole("button", { name: /Apply suggested status/ }));
    await page.waitForLoadState("networkidle");
    await wait(1500);
    d.end();

    await d.goto("/customers");
    await wait(300);
    d.begin();
    await d.caption("Every customer, with their full quote history.");
    await d.moveTo(700, 400, 700);
    await wait(700);
    await d.click(page.getByRole("link", { name: "Jordan Miller" }).first());
    await page.waitForURL(/\/customers\/.+/);
    await page.waitForLoadState("networkidle");
    await wait(1800);
    d.end();

    await d.goto("/quotes");
    await wait(300);
    d.begin();
    await d.caption("Filter your pipeline and export it to CSV.");
    await d.click(page.getByRole("button", { name: "Mine", exact: true }).or(page.getByRole("link", { name: "Mine", exact: true })).first());
    await page.waitForLoadState("networkidle");
    await wait(900);
    await d.hover(page.getByRole("link", { name: "Export CSV" }), 700);
    await wait(1200);
    d.end();

    await d.goto("/reports");
    await wait(300);
    d.begin();
    await d.caption("See your win rate, revenue and what's working.");
    await d.moveTo(640, 320, 700);
    await wait(1300);
    await d.scrollToElement(page.getByText("By month", { exact: true }), 120, 1400);
    await wait(1200);
    await d.scrollToElement(page.getByText("By job type", { exact: true }), 120, 1100);
    await wait(1500);
    d.end();

    await d.goto("/settings/sequences");
    await wait(300);
    d.begin();
    await d.caption("Write your own follow-up sequences.");
    await d.moveTo(800, 400, 700);
    await wait(900);
    await d.scrollToElement(page.getByText("Step 1", { exact: true }), 150, 1300);
    await wait(1600);
    d.end();

    await d.goto("/settings");
    await wait(300);
    d.begin();
    await d.caption("Your logo on every quote, PDF and email.");
    await d.hover(page.locator('input[name="logo"]'), 700);
    await page.setInputFiles('input[name="logo"]', logo);
    await wait(400);
    await d.click(page.getByRole("button", { name: "Upload logo" }));
    await page.waitForLoadState("networkidle");
    await wait(1600);
    await d.caption("Price book, templates, tax and a Monday summary email.");
    await d.scrollToElement(page.getByText("Price book", { exact: true }), 120, 1500);
    await wait(1400);
    await d.scrollToElement(page.getByText("Weekly summary", { exact: true }), 260, 1300);
    await wait(1500);
    d.end();

    await d.goto("/settings/team");
    await wait(300);
    d.begin();
    await d.caption("Bring your whole team in.");
    await d.type(page.locator('input[name="name"]').first(), "Chris Moreno");
    await d.type(page.locator('input[name="email"]').first(), "chris@lonestar-roofing.example");
    await d.click(page.getByRole("button", { name: "Send invite" }));
    await page.waitForLoadState("networkidle");
    await wait(1500);
    d.end();

    // End card, styled like the homepage.
    await page.setContent(`<!doctype html><html><body style="margin:0;height:100vh;display:grid;place-items:center;background:#f8f8f3;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#20372e">
      <div style="text-align:center">
        <div style="display:inline-flex;align-items:center;gap:12px;font-weight:700;font-size:30px;letter-spacing:-.02em"><span style="display:grid;place-items:center;width:52px;height:52px;border-radius:16px;background:#285742;color:#fff"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></span>QuoteFollow</div>
        <h1 style="margin:34px 0 0;font-size:64px;line-height:1;font-weight:600;letter-spacing:-.06em">Good work deserves a <em style="font-family:Georgia,serif;font-weight:500;color:#598264">follow-up.</em></h1>
        <p style="margin:26px 0 0;font-size:24px;color:#60736a">Start your 7-day free trial today.</p>
      </div></body></html>`);
    await wait(300);
    d.begin();
    await wait(3500);
    d.end();
    await finishClip(context, cdp);
  }

  await browser.close();
  writeFileSync(path.join(OUT, "scenes.json"), JSON.stringify(scenes, null, 2));
  console.log(`Recorded ${scenes.length} scenes.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
