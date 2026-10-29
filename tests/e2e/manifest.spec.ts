import { readdirSync } from "node:fs";
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
    // Hover shows the summary only; facts and screenshots are in the popup.
    await expect(panel("cerebro").locator("p")).toHaveCount(1);
    await expect(panel("cerebro").locator(".visual, dl, a")).toHaveCount(0);
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
    // No focus ring left on a clicked row once the popup closes.
    await expect(
      page.locator('a.row[data-target="atlantis-hud"]'),
    ).not.toBeFocused();
  });

  test("keyboard users get focus back on the row", async ({ page }) => {
    await page.goto("/");
    const row = page.locator('a.row[data-target="raster"]');
    await row.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: "raster" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(row).toBeFocused();
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

  test("hidden projects are left out", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('[data-target="slidecraft"]')).toHaveCount(0);
    await expect(page.locator('[data-dialog="slidecraft"]')).toHaveCount(0);
    // Its screenshots are kept in the repo but not published with the site.
    const published = readdirSync("dist/_astro");
    expect(published.filter((file) => /^slidecraft/i.test(file))).toEqual([]);
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
  test.skip(({ isMobile }) => isMobile, "uses desktop clicks and keys");

  async function openDialog(page: Page, shots: (count: number) => boolean) {
    await page.goto("/");
    const ids = await page
      .locator("dialog[data-dialog]")
      .evaluateAll((dialogs) =>
        dialogs.map((d) => [
          (d as HTMLElement).dataset.dialog!,
          d.querySelectorAll(".shot").length,
        ]),
      );
    const match = ids.find(([, count]) => shots(count as number));
    test.skip(!match, "no project has a matching screenshot set");
    const [id, count] = match as [string, number];
    await page.locator(`a.row[data-target="${id}"]`).click();
    const dialog = page.locator(`dialog[data-dialog="${id}"]`);
    await expect(dialog).toBeVisible();
    return { dialog, slides: dialog.locator(".shot"), count };
  }

  test("advance on their own", async ({ page }) => {
    await page.clock.install();
    const { slides } = await openDialog(page, (count) => count > 1);
    await expect(slides.first()).toHaveAttribute("data-active", "");

    await page.clock.runFor(4000);
    await expect(slides.nth(1)).toHaveAttribute("data-active", "");
    await expect(slides.first()).toHaveAttribute("aria-hidden", "true");
  });

  test("can be chosen and then stay put", async ({ page }) => {
    await page.clock.install();
    const { dialog, slides, count } = await openDialog(page, (n) => n > 1);
    const last = dialog.getByRole("button", {
      name: `Show screenshot ${count} of ${count}`,
    });
    await last.click();
    await expect(last).toHaveAttribute("aria-pressed", "true");
    await expect(slides.last()).toHaveAttribute("data-active", "");

    await page.clock.runFor(12000);
    await expect(slides.last()).toHaveAttribute("data-active", "");
  });

  test("slide with the arrow keys in the popup", async ({ page }) => {
    const { slides } = await openDialog(page, (count) => count > 1);
    await expect(slides.first()).toHaveAttribute("data-active", "");

    await page.keyboard.press("ArrowRight");
    await expect(slides.nth(1)).toHaveAttribute("data-active", "");
    await page.keyboard.press("ArrowLeft");
    await expect(slides.first()).toHaveAttribute("data-active", "");
    await page.keyboard.press("ArrowLeft");
    await expect(slides.last()).toHaveAttribute("data-active", "");
  });

  test("expand to fullscreen from the popup", async ({ page }) => {
    const { dialog } = await openDialog(page, (count) => count > 0);
    const zoom = dialog.locator(".zoom");
    await expect(zoom).toHaveAttribute("aria-pressed", "false");

    await dialog.locator(".shot[data-active]").click();
    await expect(zoom).toHaveAttribute("aria-pressed", "true");
    const box = await dialog.locator(".visual").boundingBox();
    const viewport = page.viewportSize()!;
    expect(box?.width).toBe(viewport.width);

    await dialog.locator(".shot[data-active]").click();
    await expect(zoom).toHaveAttribute("aria-pressed", "false");
    await expect(dialog).toBeVisible();
  });

  test("fall back to an overlay that Esc leaves first", async ({ page }) => {
    await page.addInitScript(() => {
      // Like iPhone Safari: no fullscreen for elements.
      Object.defineProperty(Element.prototype, "requestFullscreen", {
        value: undefined,
      });
    });
    const { dialog } = await openDialog(page, (count) => count > 0);
    const zoom = dialog.locator(".zoom");

    await zoom.click();
    await expect(dialog.locator(".visual")).toHaveAttribute(
      "data-expanded",
      "",
    );
    await page.keyboard.press("Escape");
    await expect(zoom).toHaveAttribute("aria-pressed", "false");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("projects without any keep the placeholder", async ({ page }) => {
    const { dialog } = await openDialog(page, (count) => count === 0);
    await expect(dialog.getByText("AWAITING VISUAL FEED")).toBeVisible();
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
