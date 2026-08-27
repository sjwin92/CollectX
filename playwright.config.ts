import { defineConfig, devices } from "@playwright/test";
import { STORAGE_STATE } from "./e2e/global-setup";

// Smoke tests run against a deployed URL by default (the live Cloudflare Pages
// site). Override with BASE_URL, e.g. BASE_URL=http://localhost:8080 npm run e2e
const baseURL = process.env.BASE_URL ?? "https://collectx.pages.dev";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1, // tests hit a live deployment — tolerate a transient blip
  reporter: [["list"]],
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      testIgnore: /authed\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "mobile",
      testIgnore: /authed\.spec\.ts/,
      use: { ...devices["Pixel 7"] },
    },
    {
      name: "authed",
      testMatch: /authed\.spec\.ts/,
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1280, height: 800 },
        storageState: STORAGE_STATE,
      },
    },
  ],
});
