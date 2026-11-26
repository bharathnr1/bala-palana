import { expect, test, type Page } from "@playwright/test";

/**
 * The M2-07 role checks: a concern reaches Needs attention and clears once it
 * is closed, and a teacher never sees a health entry a coordinator recorded.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures), so it uses the demo accounts and invents its own child names.
 */

async function signIn(page: Page, name: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function signOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
}

async function createChild(page: Page, fullName: string): Promise<string> {
  await page.goto("/children/new");
  await page.fill("#fullName", fullName);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page).toHaveURL(/\/children\/[0-9a-f-]{36}$/);
  return page.url();
}

test("a concern reaches Needs attention and clears when the coordinator closes it", async ({
  page,
}) => {
  // Unique per run, so a previous run's leftover child cannot be mistaken for it.
  const childName = `FLOW Attention ${Date.now()}`;

  await signIn(page, "Demo Admin");
  const childUrl = await createChild(page, childName);
  await signOut(page);

  // A teacher records a concern with the default one-week follow-up.
  await signIn(page, "Demo Teacher");
  await page.goto(`${childUrl}?tab=journey`);
  await page.locator("#main-content").getByRole("link", { name: "Observe" }).click();
  await page.getByRole("button", { name: "Concern / needs help", exact: true }).click();
  await page.fill("#observe-note", "Needs support with reading.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved for 1 child");
  await signOut(page);

  // The coordinator sees the child on Needs attention.
  await signIn(page, "Demo Coordinator");
  await page.goto("/attention");
  const row = page.locator("li", { hasText: childName });
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("1 open concern");

  // Closing the follow-up from the entry sheet removes the reason.
  await page.goto(`${childUrl}?tab=journey`);
  await page
    .locator("#main-content a[href*='entry=']")
    .filter({ hasText: "Needs support with reading." })
    .click();
  const sheet = page.locator("dialog[open]");
  await expect(sheet).toBeVisible();
  await sheet.getByRole("button", { name: "Close follow-up" }).click();
  await expect(sheet.getByRole("button", { name: "Reopen follow-up" })).toBeVisible();
  await sheet.getByRole("button", { name: "Close", exact: true }).click();

  await page.goto("/attention");
  await expect(page.locator("li", { hasText: childName })).toHaveCount(0);
});

test("a teacher cannot see a health entry a coordinator recorded", async ({ page }) => {
  await signIn(page, "Demo Admin");
  const childUrl = await createChild(page, `FLOW Health ${Date.now()}`);
  await signOut(page);

  await signIn(page, "Demo Coordinator");
  await page.goto(`${childUrl}?tab=journey`);
  await page.locator("#main-content").getByRole("link", { name: "Observe" }).click();
  await page.getByRole("button", { name: "Health / well-being", exact: true }).click();
  await page.fill("#observe-note", "Clinic visit on Tuesday.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Saved for 1 child");
  await signOut(page);

  await signIn(page, "Demo Teacher");
  await page.goto(`${childUrl}?tab=journey`);
  await expect(page.getByText("Clinic visit on Tuesday.")).toHaveCount(0);
  await expect(page.getByText("Restricted", { exact: true })).toHaveCount(0);
});
