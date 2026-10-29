import { expect, test } from "@playwright/test";

test("contact address becomes a mailto link but is absent from the HTML", async ({
  page,
  request,
}) => {
  const html = await (await request.get("/")).text();
  expect(html).not.toContain("henrik@kurelid.se");

  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "> HENRIK@KURELID.SE" }),
  ).toHaveAttribute("href", "mailto:henrik@kurelid.se");
});

test("share metadata points at the published image", async ({
  page,
  request,
}) => {
  await page.goto("/");
  const image = await page
    .locator('meta[property="og:image"]')
    .getAttribute("content");
  expect(image).toBe("https://rmstdope.eu/og.png");
  const response = await request.get("/og.png");
  expect(response.ok()).toBe(true);
  expect(response.headers()["content-type"]).toBe("image/png");
});
