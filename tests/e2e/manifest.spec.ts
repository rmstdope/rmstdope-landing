import { expect, test } from "@playwright/test";

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
