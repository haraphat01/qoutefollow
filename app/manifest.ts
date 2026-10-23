import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuoteFollow",
    short_name: "QuoteFollow",
    description:
      "Organize roofing, HVAC, and plumbing estimates with a thoughtful follow-up schedule.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0c281c",
    theme_color: "#0c281c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
