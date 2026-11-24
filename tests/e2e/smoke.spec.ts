import { expect, test } from "@playwright/test";

/**
 * The M0-13 smoke path (06-testing § Layers): sign in as the admin, add a
 * child, open her profile; then sign in as a teacher and confirm she can read
 * the profile but has no Edit control.
 *
 * Runs against `next start` with `AUTH_MODE=test` and a freshly seeded demo
 * database (CI creates one for this step), so the "Demo Admin" and
 * "Demo Teacher" buttons exist.
 */
test("an admin adds a child and a teacher can read her profile without editing", async ({
  page,
}) => {
  await page.goto("/login");

  await page.getByRole("button", { name: /Demo Admin/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/children/new");
  await page.fill("#fullName", "E2E Child");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Save child" }).click();

  await expect(page).toHaveURL(/\/children\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Child");
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(1);

  const childUrl = page.url();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.getByRole("button", { name: /Demo Teacher/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto(childUrl);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("E2E Child");
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);
});
