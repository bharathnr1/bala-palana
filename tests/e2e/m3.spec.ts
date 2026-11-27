import { expect, test, type Page } from "@playwright/test";

/**
 * The M3-06 role check: a coordinator builds a team in the cycle the board
 * shows, swaps a child mid-cycle, and "Who was on duty" answers correctly on
 * both sides of the swap.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures); the children are named uniquely so a repeat cannot be mistaken
 * for an earlier run's.
 */

async function signIn(page: Page, name: string): Promise<void> {
  await page.goto("/login");
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page).toHaveURL(/\/$/);
}

async function createChild(page: Page, fullName: string): Promise<void> {
  await page.goto("/children/new");
  await page.fill("#fullName", fullName);
  await page.check('input[name="consent"]');
  await page.getByRole("button", { name: "Save child" }).click();
  await expect(page).toHaveURL(/\/children\/[0-9a-f-]{36}$/);
}

/** The next calendar day, in the `YYYY-MM-DD` shape a date input takes. */
function nextDay(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

test("a coordinator swaps a child mid-cycle and the lookup follows the dates", async ({
  page,
}) => {
  const stamp = Date.now();
  const outgoing = `FLOW Duty Out ${stamp}`;
  const incoming = `FLOW Duty In ${stamp}`;

  await signIn(page, "Demo Coordinator");
  await createChild(page, outgoing);
  await createChild(page, incoming);

  await page.goto("/duties");

  // The cycle on screen: its first day, read from the edit-dates panel.
  await page.getByRole("button", { name: "Edit dates" }).click();
  const startOn = await page.locator('input[name="startOn"]').inputValue();
  const swapOn = nextDay(startOn);
  await page.getByRole("button", { name: "Edit dates" }).click();

  // A fresh team under the first duty — the one the lookup defaults to — with
  // both children in it. The new team sorts last within that duty's section.
  const firstDuty = page.locator("section[aria-labelledby^='duty-']").first();
  await firstDuty.getByRole("button", { name: "＋ Team" }).click();
  // Pin the new team by its label at once: the two browser projects share one
  // database, so "the last card" can point at the other project's team later.
  const teamLabel = await firstDuty.locator("section[aria-label]").last().getAttribute("aria-label");
  if (!teamLabel) throw new Error("the new team has no label");
  const team = page.locator(`section[aria-label="${teamLabel}"]`);
  await expect(team).toBeVisible();

  for (const name of [outgoing, incoming]) {
    await team.getByRole("button", { name: "＋ Add children" }).click();
    const picker = page.getByRole("dialog");
    await picker.locator('input[type="search"]').fill(name);
    await picker.getByRole("button", { name: new RegExp(name) }).first().click();
    await picker.getByRole("button", { name: "Save" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }

  // Outgoing leaves after the first day; incoming starts the day after.
  await team.getByRole("button", { name: new RegExp(outgoing) }).click();
  let sheet = page.getByRole("dialog");
  await sheet.getByLabel("To").fill(startOn);
  await sheet.getByRole("button", { name: "Set dates" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  await team.getByRole("button", { name: new RegExp(incoming) }).click();
  sheet = page.getByRole("dialog");
  await sheet.getByLabel("From").fill(swapOn);
  await sheet.getByRole("button", { name: "Set dates" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);

  // The lookup answers each side of the swap with the right child.
  await page.goto("/duties/lookup");
  await page.getByLabel("Day").fill(startOn);
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("link", { name: new RegExp(outgoing) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(incoming) })).toHaveCount(0);

  await page.getByLabel("Day").fill(swapOn);
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page.getByRole("link", { name: new RegExp(incoming) })).toBeVisible();
  await expect(page.getByRole("link", { name: new RegExp(outgoing) })).toHaveCount(0);
});
