import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against a deployed URL by default (the live Cloudflare Pages
// site). Override with BASE_URL, e.g. BASE_URL=http://localhost:8080 npm run e2e
const baseURL = process.env.BASE_URL ?? "https://collectx.pages.dev";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
