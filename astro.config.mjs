import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  site: "https://wedding.zedlabs.id",
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes("/admin") &&
        !page.includes("/qrcode") &&
        !page.includes("/checkin") &&
        !page.includes("/api/"),
    }),
  ],
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
          enabled: false,
        },
        workbox: {
          navigateFallback: null,
          globPatterns: ["**/*.{css,js,html,svg,png,ico,txt,woff2}"],
          runtimeCaching: [
            {
              urlPattern: ({ url }) =>
                url.pathname.startsWith("/api/media/") ||
                url.pathname.endsWith(".mp3"),
              handler: "CacheFirst",
              options: {
                cacheName: "local-media-cache",
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
        },
        manifest: {
          name: "Wedding Management",
          short_name: "Wedding Management",
          description:
            "Platform Undangan Pernikahan Digital, RSVP, Check-In QR & Manajemen Persiapan Nikah",
          theme_color: "#0d1117",
          background_color: "#0d1117",
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
