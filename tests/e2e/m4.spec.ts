import { expect, test, type Page } from "@playwright/test";

/**
 * The M4 happy path: a teacher picks a class, types a mark, is told inline that
 * it is above the maximum, fixes it, and the value survives a reload without
 * the page ever navigating away.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures).
 */

async function signIn(page: Page, name: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/$/);
}

function firstClassRow(page: Page) {
  return page
    .locator("li")
    .filter({ has: page.getByLabel("Marks") })
    .first();
}

test("a teacher enters marks with inline validation and no reload", async ({ page }) => {
  await signIn(page, "Demo Teacher");
  await page.goto("/academics");

  // Demo data seeds marks for grade 5, term 1, Mathematics, so the class page
  // and the remembered maximum both exist (06-testing § Fixtures).
  await page.selectOption("#academics-grade", "grade_5");
  await page.selectOption("#academics-term", "term_1");
  await page.selectOption("#academics-subject", "mathematics");
  await page.getByRole("button", { name: "Show children" }).click();

  const row = firstClassRow(page);
  await expect(row).toBeVisible();

  const marks = row.getByLabel("Marks");
  // Both browser projects (and a retry) share one demo database, so the value
  // must differ from what is already stored or autosave has nothing to save.
  const original = await marks.inputValue();
  const saved = original === "77.5" ? "78" : "77.5";

  await marks.fill("101");
  await marks.blur();
  await expect(row.getByText("Marks cannot be more than the maximum.")).toBeVisible();

  await marks.fill(saved);
  await marks.blur();
  await expect(row.getByText("Saved")).toBeVisible();
  // Autosave never navigates.
  await expect(page).toHaveURL(/\/academics\?/);

  await page.reload();
  await expect(firstClassRow(page).getByLabel("Marks")).toHaveValue(saved);
});
