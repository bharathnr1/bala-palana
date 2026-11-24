import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end specs live in `tests/e2e` (06-testing). The first specs arrive
 * with M0-13; until then the suite is empty and `pnpm e2e` passes.
 *
 * The server under test is `next start`, so run `pnpm build` first (05-ops
 * § CI, step 6). Locally an already-running dev server is reused.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
    { name: "desktop-chrome", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "pnpm start",
    url: process.env.APP_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
