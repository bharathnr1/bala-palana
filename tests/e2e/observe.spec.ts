import { expect, test, type Locator } from "@playwright/test";

/**
 * The quick observation path (M2-02): open from a profile (the child is
 * pre-selected), add two tags and a one-week follow-up, write a note and save,
 * in six taps or fewer. Runs against the seeded demo database with test auth.
 */
test("an observation with two tags and a one-week follow-up takes six taps or fewer", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Demo Admin/ }).click();
  await expect(page).toHaveURL(/\/$/);

  // Setup, not part of the taps under test: one child to observe.
  await page.goto("/children/new");
  await page.fill("#fullName", "Observe Child");
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page).toHaveURL(/\/children\/[0-9a-f-]{36}$/);

  // Opening from the profile pre-selects the child.
  await page.locator("#main-content").getByRole("link", { name: "Observe" }).click();
  await expect(page).toHaveURL(/\/observe\?child=/);
  await expect(page.getByRole("button", { name: /Remove: Observe Child/ })).toHaveCount(1);

  let taps = 0;
  const tap = async (locator: Locator) => {
    taps += 1;
    await locator.click();
  };

  await tap(page.getByRole("button", { name: "Improving", exact: true }));
  await tap(page.getByRole("button", { name: "Participation", exact: true }));
  await tap(page.getByRole("button", { name: "1 week", exact: true }));
  await page.fill("#observe-note", "Sang the morning prayer clearly.");
  await tap(page.getByRole("button", { name: "Save", exact: true }));

  await expect(page.getByRole("status")).toContainText("Saved for 1 child");
  expect(taps).toBeLessThanOrEqual(6);
});
