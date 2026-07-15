// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://prismatic-labs.github.io",
  base: "/yorkshire-compute-belt",
  // Keep whitespace in prose; compressHTML collapses "word </a> (note)" into "word</a>(note)".
  compressHTML: false,
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
  },
});
