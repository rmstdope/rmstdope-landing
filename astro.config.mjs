// @ts-check
import { defineConfig } from "astro/config";

export default defineConfig({
  site: "https://rmstdope.eu",
  // Always emit hashed CSS files so HTML stays small and assets cache immutably.
  build: { inlineStylesheets: "never" },
});
