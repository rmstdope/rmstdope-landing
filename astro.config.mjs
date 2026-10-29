// @ts-check
import { readdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

// Every screenshot is imported so its name can be validated, which makes
// Astro copy originals that the page never shows (e.g. hidden projects). Drop
// any image in _astro that no emitted page, stylesheet or script references.
/** @type {import("astro").AstroIntegration} */
const pruneUnusedImages = {
  name: "prune-unused-images",
  hooks: {
    "astro:build:done": async ({ dir, logger }) => {
      const root = fileURLToPath(dir);
      const files = await readdir(root, { recursive: true });
      const text = files.filter((file) => /\.(html|css|js|json)$/.test(file));
      const referenced = (
        await Promise.all(
          text.map((file) => readFile(join(root, file), "utf8")),
        )
      ).join("\n");
      const images = files.filter((file) =>
        /^_astro[\\/].+\.(png|jpe?g|webp|avif|gif)$/i.test(file),
      );
      for (const file of images) {
        const name = file.split(/[\\/]/).pop() ?? file;
        if (referenced.includes(name)) continue;
        await rm(join(root, file));
        logger.info(`removed unused ${file}`);
      }
    },
  },
};

export default defineConfig({
  site: "https://rmstdope.eu",
  // Always emit hashed CSS files so HTML stays small and assets cache immutably.
  build: { inlineStylesheets: "never" },
  integrations: [pruneUnusedImages],
});
