import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

const baked = JSON.parse(readFileSync("src/data/github-stats.json", "utf8"));

test.describe("live stats", () => {
  test.skip(({ isMobile }) => isMobile, "same script on every layout");

  test("replaces build-time numbers with the latest /stats.json", async ({
    page,
  }) => {
    await page.route("/stats.json", async (route) => {
      const stats = await (await route.fetch()).json();
      stats.publicRepos = 42;
      stats.generatedAt = "2030-01-02T03:04:05Z";
      stats.repos.neser.stars = 99;
      stats.repos.neser.pushedAt = "2030-01-01T00:00:00Z";
      await route.fulfill({ json: stats });
    });
    await page.goto("/");

    await expect(page.locator('.status [data-stat="publicRepos"]')).toHaveText(
      "42",
    );
    await expect(page.locator('[data-stat="generatedAt"]')).toHaveText(
      "2030-01-02 03:04Z",
    );
    const panel = page.locator('dialog[data-dialog="neser"]');
    await expect(panel.locator('[data-stat="stars"]')).toHaveText("99");
    await expect(panel.locator('[data-stat="pushed"]')).toHaveText(
      "2030-01-01",
    );
    await expect(
      page.locator('a.row[data-target="neser"] [data-stat="stars"]'),
    ).toHaveText("99");
  });

  test("rebuilds language bars when the ranking changes", async ({ page }) => {
    await page.route("/stats.json", async (route) => {
      const stats = await (await route.fetch()).json();
      stats.languages = [
        { name: "Rust", repos: 9 },
        { name: "Go", repos: 3 },
        { name: "Shell", repos: 1 },
      ];
      await route.fulfill({ json: stats });
    });
    await page.goto("/");

    const bars = page.locator("[data-lang-list] li");
    await expect(bars).toHaveCount(2);
    await expect(bars.first()).toHaveAttribute("data-lang", "Rust");
    await expect(bars.first().locator(".count")).toHaveText("9");
    await expect(page.locator('[data-stat="restRepos"]')).toHaveText("1");
  });

  test("ignores /stats.json with a malformed repo entry", async ({ page }) => {
    await page.route("/stats.json", async (route) => {
      const stats = await (await route.fetch()).json();
      stats.publicRepos = 42;
      stats.repos.neser.pushedAt = null;
      await route.fulfill({ json: stats });
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.status [data-stat="publicRepos"]')).toHaveText(
      String(baked.publicRepos),
    );
  });

  test("keeps build-time numbers when /stats.json is malformed", async ({
    page,
  }) => {
    await page.route("/stats.json", (route) =>
      route.fulfill({ json: { publicRepos: 0, message: "rate limited" } }),
    );
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator('.status [data-stat="publicRepos"]')).toHaveText(
      String(baked.publicRepos),
    );
  });
});
