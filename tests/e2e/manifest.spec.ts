import AxeBuilder from "@axe-core/playwright";
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

  test("clicking a row opens its dossier popup", async ({ page }) => {
    await page.goto("/");
    await page.locator('a.row[data-target="atlantis-hud"]').click();
    const dialog = page.getByRole("dialog", { name: "atlantis-hud" });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(
      dialog.getByRole("link", { name: "Engage on GitHub: atlantis-hud" }),
    ).toHaveAttribute("href", "https://github.com/rmstdope/atlantis-hud");
    await expect(
      dialog.getByRole("link", { name: "Live: atlantis-hud" }),
    ).toHaveAttribute("href", "https://atlantis-hud.rmstdope.eu");

    // Let the opening fade finish so contrast is measured at full strength.
    await dialog.evaluate((el) =>
      Promise.all(el.getAnimations().map((a) => a.finished)),
    );
    const { violations } = await new AxeBuilder({ page })
      .include('dialog[data-dialog="atlantis-hud"]')
      .analyze();
    const serious = violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    );
    expect(serious.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(
      page.locator('a.row[data-target="atlantis-hud"]'),
    ).toBeFocused();
  });

  test("the popup closes from its button and the backdrop", async ({
    page,
  }) => {
    await page.goto("/");
    const dialog = page.getByRole("dialog", { name: "cerebro" });
    await page.locator('a.row[data-target="cerebro"]').click();
    await dialog.getByRole("button", { name: "Close" }).click();
    await expect(dialog).toBeHidden();

    await page.locator('a.row[data-target="cerebro"]').click();
    await expect(dialog).toBeVisible();
    await page.mouse.click(5, 5);
    await expect(dialog).toBeHidden();
  });

  test("rows link to the GitHub repository without JavaScript", async ({
    page,
  }) => {
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

  test("slide with the arrow keys in the popup", async ({ page }) => {
    const { panel } = await showPanel(page, (count) => count > 1);
    const id = await panel.getAttribute("data-panel");
    await page.locator(`a.row[data-target="${id}"]`).click();
    const slides = page.locator(`dialog[data-dialog="${id}"] .shot`);
    await expect(slides.first()).toHaveAttribute("data-active", "");

    await page.keyboard.press("ArrowRight");
    await expect(slides.nth(1)).toHaveAttribute("data-active", "");
    await page.keyboard.press("ArrowLeft");
    await expect(slides.first()).toHaveAttribute("data-active", "");
    await page.keyboard.press("ArrowLeft");
    await expect(slides.last()).toHaveAttribute("data-active", "");
  });

  test("projects without any keep the placeholder", async ({ page }) => {
    const { panel } = await showPanel(page, (count) => count === 0);
    await expect(panel.getByText("AWAITING VISUAL FEED")).toBeVisible();
  });
});

test.describe("mobile", () => {
  test.skip(({ isMobile }) => !isMobile, "touch layout only");

  test("tapping a row opens its dossier popup", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".target")).toBeHidden();

    await page.locator('a.row[data-target="atlantis-hud"]').tap();
    const dialog = page.getByRole("dialog", { name: "atlantis-hud" });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("link", { name: "Engage on GitHub: atlantis-hud" }),
    ).toHaveAttribute("href", "https://github.com/rmstdope/atlantis-hud");
    await expect(
      dialog.getByRole("link", { name: "Live: atlantis-hud" }),
    ).toHaveAttribute("href", "https://atlantis-hud.rmstdope.eu");

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);

    await dialog.getByRole("button", { name: "Close" }).tap();
    await expect(dialog).toBeHidden();
  });
});
