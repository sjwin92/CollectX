import { test, expect, type Page } from "@playwright/test";

// Signed-in flows, using the session saved by global-setup for the seeded
// e2e-tester account (two collection cards: Gyarados, Houndoom).

function trackConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() !== "error") return;
    const t = msg.text();
    if (!/CORS policy|Uncaught|TypeError|ReferenceError|is not a function|is not defined|Cannot read|Cannot access/i.test(t)) return;
    errors.push(t);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("signed-in shell", () => {
  test("is actually authenticated", async ({ page }) => {
    await page.goto("/collection");
    // A signed-out visitor gets bounced to /auth.
    await expect(page).not.toHaveURL(/\/auth/);
    await expect(page.getByRole("link", { name: /^Sign Up$/ })).toHaveCount(0);
  });

  test("collection shows the seeded cards", async ({ page }) => {
    await page.goto("/collection");
    await expect(page.getByText("Gyarados").first()).toBeVisible({ timeout: 15_000 });
  });

  const pages: [string, RegExp][] = [
    ["/account-settings", /account/i],
    ["/orders", /orders/i],
    ["/trades", /trades/i],
    ["/grade", /grade/i],
    ["/wishlist", /want ?list|wishlist/i],
  ];
  for (const [path, heading] of pages) {
    test(`${path} loads without errors`, async ({ page }) => {
      const errors = trackConsoleErrors(page);
      await page.goto(path);
      await expect(page.getByRole("heading").filter({ hasText: heading }).first()).toBeVisible({
        timeout: 15_000,
      });
      expect(errors, errors.join("\n")).toEqual([]);
    });
  }
});

test.describe("sell a card", () => {
  test("create a sale listing → it appears in the marketplace → report it", async ({ page }) => {
    await page.goto("/marketplace");

    // Open the create-listing modal.
    await page.getByRole("button", { name: /create listing/i }).first().click();
    const modal = page.getByRole("dialog");
    await expect(modal.getByText(/select a card from your collection/i)).toBeVisible();

    // Pick the seeded Gyarados.
    await modal.getByText("Gyarados").first().click();

    // "Sell for cash" is the default listing type.
    await expect(modal.getByRole("radio", { name: /sell for cash/i })).toHaveAttribute(
      "data-state",
      "on",
    );

    await modal.getByLabel(/asking price/i).fill("9.99");
    await modal.getByRole("button", { name: /^create listing$/i }).click();

    // Success toast, modal closes.
    await expect(page.getByText("Listing created", { exact: true })).toBeVisible({ timeout: 15_000 });
    await expect(modal).toBeHidden();

    // The listing shows up in the marketplace feed.
    await page.goto("/marketplace");
    const card = page.getByText("Gyarados").first();
    await expect(card).toBeVisible({ timeout: 15_000 });

    // Open it and file a report.
    await card.click();
    await expect(page).toHaveURL(/\/listings\//, { timeout: 10_000 });

    await page.getByRole("button", { name: /^report$/i }).click();
    const reportDialog = page.getByRole("dialog");
    await expect(reportDialog.getByText(/report this listing/i)).toBeVisible();
    await reportDialog.getByRole("combobox").click();
    await page.getByRole("option", { name: /not as described/i }).click();
    await reportDialog.getByRole("button", { name: /submit report/i }).click();
    await expect(page.getByText("Report submitted", { exact: true })).toBeVisible({ timeout: 15_000 });
  });
});
