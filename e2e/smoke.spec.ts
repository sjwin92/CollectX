import { test, expect, type Page } from "@playwright/test";

// Unauthenticated smoke coverage: the pages a visitor hits before signing in.
// Authed flows (list a card, buy, grade) need credentials and aren't covered
// here.

/** Fail a test if the page logged a real console error while it was open. */
function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const text = msg.text();
    // Ignore noise that isn't an app bug.
    if (/favicon|manifest|third-party cookie|Download the React DevTools/i.test(text)) return;
    errors.push(text);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("public pages", () => {
  test("homepage loads with the buy & sell hero", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/");
    await expect(page).toHaveTitle(/Buy & Sell Pok/i);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Buy & sell/i);
    await expect(page.getByRole("link", { name: /start selling/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /browse cards/i })).toBeVisible();
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("feature grid leads with selling", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /sell in minutes/i })).toBeVisible();
    await expect(page.getByRole("heading", { name: /trade card-for-card/i })).toBeVisible();
  });

  const legalPages: [string, RegExp][] = [
    ["/terms", /Terms of Service/i],
    ["/privacy", /Privacy Policy/i],
    ["/buyer-protection", /Buyer Protection & Disputes/i],
    ["/prohibited-items", /Prohibited Items & Conduct/i],
  ];
  for (const [path, heading] of legalPages) {
    test(`${path} renders (deep link + SPA routing)`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status(), `${path} HTTP status`).toBeLessThan(400);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
      await expect(page.getByText(/Draft for review/i)).toBeVisible();
    });
  }

  test("footer legal links navigate", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: /Prohibited Items/i }).click();
    await expect(page).toHaveURL(/\/prohibited-items$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/Prohibited Items/i);
  });

  test("auth page loads a sign-in form", async ({ page }) => {
    await page.goto("/auth");
    await expect(page.getByLabel(/email/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in|log in|continue/i }).first()).toBeVisible();
  });

  test("browsing cards hits Supabase and shows data", async ({ page }) => {
    const errors = trackConsoleErrors(page);
    await page.goto("/pokemon-sets");
    // Expect at least one set card / link to render from the DB within a few seconds.
    await expect(page.locator("a[href^='/pokemon-sets/'], a[href^='/set/']").first()).toBeVisible({
      timeout: 15_000,
    });
    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
  });

  test("protected route redirects to auth when signed out", async ({ page }) => {
    await page.goto("/marketplace");
    await expect(page).toHaveURL(/\/auth(\?|$)/, { timeout: 10_000 });
  });
});

test.describe("responsive", () => {
  test("no horizontal overflow on the homepage", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "body should not scroll horizontally").toBeLessThanOrEqual(1);
  });
});
