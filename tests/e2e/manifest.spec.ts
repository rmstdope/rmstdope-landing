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

// Screenshots are content: these tests pick whichever projects currently
// have a slideshow or none, so adding screenshots never breaks them.
test.describe("screenshots", () => {
  test.skip(({ isMobile }) => isMobile, "uses the desktop panel");

  async function showPanel(page: Page, shots: (count: number) => boolean) {
    await page.goto("/");
    const ids = await page
      .locator("[data-panel]")
      .evaluateAll((panels) =>
        panels.map((p) => [
          (p as HTMLElement).dataset.panel!,
          p.querySelectorAll(".shot").length,
        ]),
      );
    const match = ids.find(([, count]) => shots(count as number));
    test.skip(!match, "no project has a matching screenshot set");
    const [id, count] = match as [string, number];
    await page.locator(`a.row[data-target="${id}"]`).hover();
    const panel = page.locator(`[data-panel="${id}"]`);
    await expect(panel).toBeVisible();
    return { panel, slides: panel.locator(".shot"), count };
  }

  test("advance on their own", async ({ page }) => {
    await page.clock.install();
    const { slides } = await showPanel(page, (count) => count > 1);
    await expect(slides.first()).toHaveAttribute("data-active", "");

    await page.clock.runFor(4000);
    await expect(slides.nth(1)).toHaveAttribute("data-active", "");
    await expect(slides.first()).toHaveAttribute("aria-hidden", "true");
  });

  test("can be chosen and then stay put", async ({ page }) => {
    await page.clock.install();
    const { panel, slides, count } = await showPanel(page, (n) => n > 1);
    const last = panel.getByRole("button", {
      name: `Show screenshot ${count} of ${count}`,
    });
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");
    await expect(slides.last()).toHaveAttribute("data-active", "");

    await page.clock.runFor(12000);
    await expect(slides.last()).toHaveAttribute("data-active", "");
  });

  test("projects without any keep the placeholder", async ({ page }) => {
    const { panel } = await showPanel(page, (count) => count === 0);
    await expect(panel.getByText("AWAITING VISUAL FEED")).toBeVisible();
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
