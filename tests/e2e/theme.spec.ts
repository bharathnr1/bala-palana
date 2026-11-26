import { expect, test } from "@playwright/test";

/**
 * The theme switch (04-ui-spec § Look and feel): dark is the default, and the
 * per-device choice survives a reload.
 *
 * Runs with test sign-in against the seeded demo database (06-testing
 * § Fixtures), so the demo admin exists.
 */
test("dark is the default and the switch survives a reload", async ({ page }) => {
  await page.goto("/login");
  const root = page.locator("html");
  const themeColor = page.locator('meta[name="theme-color"]');
  await expect(root).toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "dark");
  await expect(themeColor).toHaveAttribute("content", "#17110d");

  await page.getByRole("button", { name: /Demo Admin/ }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.getByRole("button", { name: "Switch to light theme" }).click();
  await expect(root).not.toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "light");
  await expect(themeColor).toHaveAttribute("content", "#fbf7f2");
  // 04-ui-spec § Look and feel: every tap target is at least 44 px.
  await expect(page.getByRole("button", { name: "Switch to dark theme" })).toHaveCSS(
    "width",
    "44px",
  );

  await page.reload();
  await expect(root).not.toHaveClass(/dark/);
  await expect(root).toHaveCSS("color-scheme", "light");

  await page.getByRole("button", { name: "Switch to dark theme" }).click();
  await page.reload();
  await expect(root).toHaveClass(/dark/);
});
