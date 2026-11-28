import { expect, test } from "@playwright/test";

/**
 * A duty write acknowledges the tap at once (04-ui-spec § Feedback and
 * loading): the tapped button spins, a pending row names the work, and the top
 * bar runs until the refreshed board arrives.
 */
test("a duty write shows pending feedback before the team arrives", async ({ page }) => {
  await page.goto("/login");
  await page.getByRole("button", { name: /Demo Coordinator/ }).click();
  await expect(page).toHaveURL(/\/$/);

  // Hold the Server Action long enough to see the pending state.
  await page.route("**/duties**", async (route) => {
    if (route.request().method() === "POST") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    await route.continue();
  });

  await page.goto("/duties");
  const firstDuty = page.locator("section[aria-labelledby^='duty-']").first();
  await firstDuty.getByRole("button", { name: "＋ Team" }).click();

  await expect(firstDuty.getByRole("status")).toContainText("Adding team");
  await expect(firstDuty.getByRole("button", { name: "Adding…" })).toBeDisabled();
  await expect(page.locator("div.fixed.inset-x-0").first()).toBeVisible();

  await expect(firstDuty.getByRole("status")).toHaveCount(0);
});
