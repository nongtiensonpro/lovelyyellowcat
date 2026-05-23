import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

const isDevCommand = process.argv.some((arg) => arg === "dev");

// https://astro.build/config
export default defineConfig({
  output: "server",
  adapter: cloudflare({
    imageService: {
      build: "compile",
      runtime: "cloudflare-binding"
    },
    sessionKVBindingName: undefined
  }),
  integrations: [react()],
  vite: {
    cacheDir: isDevCommand ? "node_modules/.vite-dev" : "node_modules/.vite-build",
    plugins: [tailwindcss()]
  },
  devToolbar: {
    enabled: false
  }
});
