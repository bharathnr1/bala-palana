import { expect, test, type Page } from "@playwright/test";

/**
 * The M5-04 happy path: a coordinator creates an enquiry, records the
 * interview, moves the enquiry on, converts the applicant to a student, and
 * finds her in the Children list.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures). The applicant's name is unique per run, so a repeat cannot be
 * mistaken for an earlier run's record.
 */

async function signIn(page: Page, name: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/$/);
}

test("a coordinator converts an enquiry into a student", async ({ page }, testInfo) => {
  const stamp = `${testInfo.project.name}-${Date.now()}`;
  const name = `FLOW Admissions ${stamp}`;

  await signIn(page, "Demo Coordinator");

  // 1. Create the enquiry; the action redirects to the new card.
  await page.goto("/admissions/new");
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Guardian").fill(`FLOW Guardian ${stamp}`);
  await page.getByRole("button", { name: "Save enquiry" }).click();
  await expect(page).toHaveURL(/\/admissions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // 2. Record the interview.
  const eventForm = page.locator("form").filter({ hasText: "Add event" });
  await eventForm.getByLabel("Event").selectOption("interview");
  await eventForm.getByRole("button", { name: "Save" }).click();
  await expect(page.locator("ol li").filter({ hasText: "Interview" })).toBeVisible();

  // 3. Move the enquiry on; the stage change writes its own event.
  const statusForm = page.locator("form").filter({ hasText: "Change status" });
  await statusForm.getByLabel("Stage").selectOption("invited");
  await statusForm.getByRole("button", { name: "Save" }).click();
  await expect(
    page.locator("ol li").filter({ hasText: "Stage change · Invited" }),
  ).toBeVisible();

  // 4. Convert the applicant; the consent gate, the joined date and the grade.
  await page.getByRole("checkbox").check();
  await page.getByLabel("Grade").selectOption({ label: "Grade 1" });
  await page.getByRole("button", { name: "Convert to student" }).click();
  await expect(page.getByRole("heading", { name: "Convert to student" })).toHaveCount(0);
  await expect(
    page.locator("ol li").filter({ hasText: "Stage change · Selected as student" }),
  ).toBeVisible();

  // 5. The child is now a student, so the default Children list finds her.
  await page.goto(`/children?q=${encodeURIComponent(name)}`);
  await expect(page.getByRole("link", { name: new RegExp(name) })).toBeVisible();
});
