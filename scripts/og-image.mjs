// Renders public/og.png (1200×630), the social share image, with the page's
// own fonts. Run `npm run og` after changing the name, tagline or palette.
import { readFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const font = (pkg, file) =>
  readFileSync(`node_modules/@fontsource/${pkg}/files/${file}`).toString(
    "base64",
  );

const html = `<!doctype html>
<style>
  @font-face { font-family: Chakra; font-weight: 700;
    src: url(data:font/woff2;base64,${font("chakra-petch", "chakra-petch-latin-700-normal.woff2")}); }
  @font-face { font-family: Plex; font-weight: 400;
    src: url(data:font/woff2;base64,${font("ibm-plex-mono", "ibm-plex-mono-latin-400-normal.woff2")}); }
  body { margin: 0; width: 1200px; height: 630px; box-sizing: border-box;
    padding: 72px 80px; display: flex; flex-direction: column; justify-content: space-between;
    background-color: #070806; color: #d9f7c4; font-family: Plex;
    background-image:
      repeating-linear-gradient(0deg, rgb(157 255 90 / 4%) 0 1px, transparent 1px 3px),
      linear-gradient(rgb(157 255 90 / 7%) 1px, transparent 1px),
      linear-gradient(90deg, rgb(157 255 90 / 7%) 1px, transparent 1px);
    background-size: auto, 48px 48px, 48px 48px;
    border: 2px solid rgb(157 255 90 / 40%); }
  .top { display: flex; justify-content: space-between; font-size: 22px; letter-spacing: .16em; }
  .brand { color: #9dff5a; font-family: Chakra; font-weight: 700; letter-spacing: .08em; }
  .warn { color: #ffb547; }
  h1 { margin: 0; font-family: Chakra; font-weight: 700; font-size: 150px; line-height: .9;
    text-transform: uppercase; color: #efffe3;
    text-shadow: 4px 0 rgb(255 181 71 / 75%), -4px 0 rgb(90 220 255 / 60%); }
  .tag { font-size: 28px; color: #a9c69b; }
  .tag b { color: #9dff5a; font-weight: 400; }
</style>
<div class="top"><span class="brand">RMSTDOPE.EU</span><span class="warn">▲ SYSTEMS ONLINE</span></div>
<h1>Henrik<br>Kurelid</h1>
<div class="tag">&gt; emulators <b>·</b> games <b>·</b> ai agents <b>·</b> demoscene<span style="color:#9dff5a">█</span></div>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: "public/og.png" });
await browser.close();
console.log("wrote public/og.png");
