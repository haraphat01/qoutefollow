"use client";

import { useEffect } from "react";

import { TRAKS_SITE_ID, TRAKS_SRC } from "@/lib/analytics";

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
  if (tracked === native || (tracked as { __publicOnly?: boolean }).__publicOnly) {
    return tracked !== native;
  }
  const limited: History["pushState"] = function (this: History, data, unused, url) {
    const target = url ? new URL(url, window.location.href).pathname : window.location.pathname;
    return (PUBLIC_PATHS.has(target) ? tracked : native).call(this, data, unused, url);
  };
  (limited as { __publicOnly?: boolean }).__publicOnly = true;
  window.history.pushState = limited;
  return true;
}

/**
 * Cookieless page analytics for public pages only. Never used inside the app
 * or on customers' quote pages: it reports the page path, and /q/ paths
 * contain the private quote link.
 */
export function PublicAnalytics() {
  // The tracker loads asynchronously; wrap its history hook once it appears.
  useEffect(() => {
    if (limitTrackingToPublicPages()) {
      return;
    }
    const timer = window.setInterval(() => {
      if (limitTrackingToPublicPages()) {
        window.clearInterval(timer);
      }
    }, 100);
    const stop = window.setTimeout(() => window.clearInterval(timer), 15_000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, []);

  if (!TRAKS_SITE_ID) {
    return null;
  }
  // React places async scripts in <head> (and loads each only once).
  return <script async defer src={TRAKS_SRC} data-site={TRAKS_SITE_ID} />;
}
