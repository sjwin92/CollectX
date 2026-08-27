import { chromium, type FullConfig } from "@playwright/test";
import { seedE2E } from "./seed.mjs";

export const STORAGE_STATE = "e2e/.auth/user.json";

// Seed the test account, sign in once through the real UI, and save the
// authenticated session for the authed project to reuse.
export default async function globalSetup(config: FullConfig) {
  const { email, password } = await seedE2E();

  const baseURL =
    config.projects.find((p) => p.use.baseURL)?.use.baseURL ??
    process.env.BASE_URL ??
    "https://collectx.pages.dev";

  const browser = await chromium.launch();
  const page = await browser.newPage({ baseURL });
  await page.goto("/auth");
  await page.getByLabel("Email", { exact: true }).first().fill(email);
  await page.getByLabel("Password", { exact: true }).first().fill(password);
  await page.getByRole("button", { name: "Sign In", exact: true }).click();

  // Login is done once we've left /auth.
  await page.waitForURL((url) => !url.pathname.startsWith("/auth"), { timeout: 20_000 });

  await page.context().storageState({ path: STORAGE_STATE });
  await browser.close();
}
