import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The demo-video build (scripts/demo) uses its own folder so it can run
  // next to `next dev`.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  serverExternalPackages: ["pdf-parse"],
  experimental: {
    agentFeedback: true,
    serverActions: {
      // PDF uploads go through a server action; allow 10 MB files plus multipart overhead.
      bodySizeLimit: "11mb",
    },
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
