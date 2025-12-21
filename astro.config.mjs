import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwind from "@tailwindcss/vite";
import node from "@astrojs/node";

export default defineConfig({
  integrations: [react()],
  output: "server",
  adapter: node({
    mode: "standalone",
  }),
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
