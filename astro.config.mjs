import { defineConfig } from "astro/config";
import cloudflare from "@astrojs/cloudflare";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";


// https://astro.build/config
export default defineConfig({
  output: "server",
  outDir: "build", // v5: tránh dist/ cũ chứa file bị khóa quyền (EPERM khi rimraf)
  adapter: cloudflare({
    imageService: {
      build: "compile",
      runtime: "cloudflare-binding"
    },
    sessionKVBindingName: undefined
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()]
  },
  devToolbar: {
    enabled: false
  }
});
