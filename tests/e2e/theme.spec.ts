import { expect, test } from "@playwright/test";

/**
 * The theme switch (04-ui-spec § Look and feel): light is the default, and the
 * per-device choice survives a reload.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures), so the demo admin exists.
 */
test("light is the default and the switch survives a reload", async ({ page }) => {
  await page.goto("/login");
  const root = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(root).not.toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "light");
  await expect(themeColor).toHaveAttribute("content", "#fbf7f2");

  await page.getByRole("button", { name: /Demo Admin/ }).click();
  await expect(page).toHaveURL(/\/$/);

  // 04-ui-spec § Look and feel: every tap target is at least 44 px.
  const toDark = page.getByRole("button", { name: "Switch to dark theme" });
  await expect(toDark).toHaveCSS("width", "44px");
  await toDark.click();
  await expect(root).toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "dark");
  await expect(themeColor).toHaveAttribute("content", "#17110d");

  await page.reload();
  await expect(root).toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "dark");

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await page.reload();
  await expect(root).not.toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "light");
});
