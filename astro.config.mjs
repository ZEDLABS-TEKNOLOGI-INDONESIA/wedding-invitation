import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  site: "http://localhost:4321",
  integrations: [react(), sitemap()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    plugins: [
      tailwind(),
      VitePWA({
        registerType: "autoUpdate",
        devOptions: {
          enabled: true,
        },
        workbox: {
          navigateFallback: "/404",
          globPatterns: ["**/*.{css,js,html,svg,png,ico,txt}"],
        },
        manifest: {
          name: "The Wedding of Fera & Yahya",
          short_name: "Fera & Yahya",
          description: "Undangan Pernikahan Digital Fera & Yahya",
          theme_color: "#020617",
          background_color: "#020617",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            {
              src: "/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
            },
            {
              src: "/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any maskable",
            },
          ],
        },
      }),
    ],
    envPrefix: "PUBLIC_",
    build: {
      rollupOptions: {
        onwarn(warning, warn) {
          if (
            warning.message.includes("isRemoteAllowed") ||
            warning.message.includes("matchHostname")
          ) {
            return;
          }
          warn(warning);
        },
      },
    },
  },
});
