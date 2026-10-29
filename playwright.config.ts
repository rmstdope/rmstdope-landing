import { defineConfig, devices } from "@playwright/test";

const port = 4321;

export default defineConfig({
  testDir: "tests/e2e",
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
  },
  // Tests run against the production build; run `npm run build` first.
  // --ignore-lock keeps Astro from detaching the server when run by an agent.
  webServer: {
    command: `npm run preview -- --port ${port} --ignore-lock`,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
