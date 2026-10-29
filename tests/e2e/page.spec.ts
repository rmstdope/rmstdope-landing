import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { liveUrl } from "../../src/data/site";

// Every outbound link must go to the GitHub profile or an rmstdope.eu deployment.
const githubLink = /^https:\/\/github\.com\/rmstdope(\/[\w.-]+)?$/;

test("outbound links stay on GitHub or rmstdope.eu", async ({ page }) => {
  await page.goto("/");
  const hrefs = await page
    .locator("a[href^='http']")
    .evaluateAll((links) => links.map((a) => a.getAttribute("href")!));
  expect(hrefs.length).toBeGreaterThan(0);
  for (const href of hrefs) {
    expect(githubLink.test(href) || liveUrl.test(href), href).toBe(true);
    expect(href).not.toContain("kurelid.se");
  }
});

test("has no serious accessibility violations", async ({ page }) => {
  await page.goto("/");
  const { violations } = await new AxeBuilder({ page }).analyze();
  const serious = violations.filter((v) =>
    ["serious", "critical"].includes(v.impact ?? ""),
  );
  expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
});

test("does not scroll horizontally", async ({ page }) => {
  await page.goto("/");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("shows the boot log immediately with reduced motion", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const opacity = await page
    .locator(".boot .warn")
    .evaluate((el) => getComputedStyle(el).opacity);
  expect(opacity).toBe("1");
});
