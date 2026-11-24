import node from "@astrojs/node";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwind from "@tailwindcss/vite";
import { defineConfig } from "astro/config";

const SITE_URL = "https://wedding.zedlabs.id";

const PRIVATE_ROUTE_RE =
  /\/(admin|superadmin|masuk|daftar|lupa-password|qrcode|checkin|offline|404|api)(\/|$)/;

export default defineConfig({
  site: SITE_URL,
  integrations: [
    react(),
    sitemap({
      filter: (page) => !PRIVATE_ROUTE_RE.test(new URL(page).pathname),
    }),
  ],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
  build: {
    inlineStylesheets: "auto",
  },
  vite: {
    plugins: [tailwind()],
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
