"use client";

import Script from "next/script";

const SITE_ID = process.env.NEXT_PUBLIC_TRAKS_SITE_ID ?? "pb_live_l8itoiz1p7ar6uazp63n2ron";

/** The only pages analytics may report. */
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/terms",
  "/privacy",
]);

/**
 * The tracker reports in-app navigation by wrapping history.pushState. Only
 * let navigation to public pages through it; moving into the app (e.g. after
 * signing in) uses the browser's own pushState, so app pages aren't reported.
 */
function limitTrackingToPublicPages() {
  const tracked = window.history.pushState;
  const native = History.prototype.pushState;
  if (tracked === native) {
    return;
  }
  window.history.pushState = function (data, unused, url) {
    const target = url ? new URL(url, window.location.href).pathname : window.location.pathname;
    return (PUBLIC_PATHS.has(target) ? tracked : native).call(this, data, unused, url);
  };
}

/**
 * Cookieless page analytics for public marketing pages only. Never used inside
 * the app or on customers' quote pages: it reports the page path, and /q/
 * paths contain the private quote link.
 */
export function PublicAnalytics() {
  if (!SITE_ID) {
    return null;
  }
  return (
    <>
      <Script id="traks-queue" strategy="afterInteractive">
        {"window.traks=window.traks||function(){(window.traks.q=window.traks.q||[]).push(arguments)}"}
      </Script>
      <Script
        src="https://traks-collect.apoaminat.workers.dev/t.js"
        data-site={SITE_ID}
        strategy="afterInteractive"
        onLoad={limitTrackingToPublicPages}
      />
    </>
  );
}
