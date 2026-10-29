import { expect, test, type Page } from "@playwright/test";

test.describe("desktop", () => {
  test.skip(({ isMobile }) => isMobile, "pointer layout only");

  test("hovering a row locks the target panel", async ({ page }) => {
    await page.goto("/");
    const panel = (id: string) => page.locator(`[data-panel="${id}"]`);
    await expect(panel("neser")).toBeVisible();

    await page.locator('a.row[data-target="cerebro"]').hover();
    await expect(panel("cerebro")).toBeVisible();
    await expect(panel("neser")).toBeHidden();
    await expect(panel("cerebro").getByRole("heading")).toHaveText("cerebro");
  });

  test("keyboard focus locks the target panel", async ({ page }) => {
    await page.goto("/");
    await page.locator('a.row[data-target="raster"]').focus();
    await expect(page.locator('[data-panel="raster"]')).toBeVisible();
  });

  test("rows open the GitHub repository", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('a.row[data-target="DDXX"]')).toHaveAttribute(
      "href",
      "https://github.com/rmstdope/DDXX",
    );
  });
});

test.describe("screenshots", () => {
  test.skip(({ isMobile }) => isMobile, "uses the desktop panel");

  const slides = (page: Page) => page.locator('[data-panel="neser"] .shot');

  test("advance on their own", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    await expect(slides(page)).toHaveCount(2);
    await expect(slides(page).first()).toHaveAttribute("data-active", "");

    await page.clock.runFor(4000);
    await expect(slides(page).nth(1)).toHaveAttribute("data-active", "");
    await expect(slides(page).first()).toHaveAttribute("aria-hidden", "true");
  });

  test("can be chosen and then stay put", async ({ page }) => {
    await page.clock.install();
    await page.goto("/");
    const panel = page.locator('[data-panel="neser"]');
    const second = panel.getByRole("button", {
      name: "Show screenshot 2 of 2",
    });
    await second.click();
    await expect(second).toHaveAttribute("aria-pressed", "true");
    await expect(slides(page).nth(1)).toHaveAttribute("data-active", "");

    await page.clock.runFor(12000);
    await expect(slides(page).nth(1)).toHaveAttribute("data-active", "");
  });

  test("projects without any keep the placeholder", async ({ page }) => {
    await page.goto("/");
    await page.locator('a.row[data-target="cerebro"]').hover();
    await expect(
      page.locator('[data-panel="cerebro"]').getByText("AWAITING VISUAL FEED"),
    ).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "touch layout only");

  test("tapping a row expands its details", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".target")).toBeHidden();

    const item = page.locator("details", { hasText: "atlantis-hud" });
    await item.locator("summary").tap();
    await expect(item).toHaveAttribute("open", "");
    await expect(
      item.getByRole("link", { name: "Engage on GitHub: atlantis-hud" }),
    ).toHaveAttribute("href", "https://github.com/rmstdope/atlantis-hud");
    await expect(
      item.getByRole("link", { name: "Live: atlantis-hud" }),
    ).toHaveAttribute("href", "https://atlantis-hud.rmstdope.eu");
  });
});
