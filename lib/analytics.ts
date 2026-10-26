export const TRAKS_SITE_ID = process.env.NEXT_PUBLIC_TRAKS_SITE_ID ?? "pb_live_l8itoiz1p7ar6uazp63n2ron";
export const TRAKS_SRC = "https://traks-collect.apoaminat.workers.dev/t.js";

/** Queue stub from the Traks snippet; safe on every page (it sends nothing). */
export const TRAKS_QUEUE_SNIPPET =
  "window.traks=window.traks||function(){(window.traks.q=window.traks.q||[]).push(arguments)}";
