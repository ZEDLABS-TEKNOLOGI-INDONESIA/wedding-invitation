import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";
import sitemap from "@astrojs/sitemap";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  site: "http://127.0.0.1:4321",
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
          runtimeCaching: [
            {
              // Cache gambar dari Unsplash, Placehold.co, Google Fonts, dll
              urlPattern:
                /^https:\/\/(images\.unsplash\.com|placehold\.co|fonts\.googleapis\.com|fonts\.gstatic\.com)\/.*/i,
              handler: "CacheFirst", // Strategi: Cek Cache dulu, baru download
              options: {
                cacheName: "external-images-fonts",
                expiration: {
                  maxEntries: 50, // Maksimal simpan 50 file
                  maxAgeSeconds: 60 * 60 * 24 * 30, // Simpan selama 30 Hari
                },
                cacheableResponse: {
                  statuses: [0, 200], // Cache jika sukses
                },
              },
            },
            {
              // Cache Musik (MP3)
              urlPattern: ({ url }) => url.pathname.endsWith(".mp3"),
              handler: "CacheFirst",
              options: {
                cacheName: "audio-cache",
                expiration: {
                  maxEntries: 5,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
              },
            },
          ],
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
