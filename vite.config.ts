import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
const base = process.env.BUDGET_BASE || "/";
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["apple-touch-icon.png", "icon.svg"],
      manifest: {
        name: "Budget — Il tuo piano",
        short_name: "Budget",
        description: "Planner mensile privato e locale",
        lang: "it",
        start_url: base,
        scope: base,
        display: "standalone",
        background_color: "#f3f3f0",
        theme_color: "#f3f3f0",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,png,svg,webmanifest}"],
        runtimeCaching: [],
        navigateFallback: `${base}index.html`,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  build: { target: "safari15" },
});
