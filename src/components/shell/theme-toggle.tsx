"use client";

import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import { flipTheme, THEME_COLORS, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * Switches between the light and dark themes (04-ui-spec § Look and feel).
 *
 * The `<html>` class is the source of truth, set before paint by the root
 * layout's inline script, so the control reads the DOM rather than keeping
 * React state. Both icons and both labels are always in the markup and CSS
 * shows the one for the current theme; that keeps the server and client HTML
 * identical and avoids a mount-only effect.
 */
export function ThemeToggle() {
  function toggleTheme() {
    const root = document.documentElement;
    const current: Theme = root.classList.contains("dark") ? "dark" : "light";
    const next = flipTheme(current);

    root.classList.toggle("dark", next === "dark");
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Blocked storage (private mode) costs persistence, not the switch itself.
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[next]);
  }

  return (
    <Button type="button" variant="ghost" size="icon" className="size-11" onClick={toggleTheme}>
      <Sun className="hidden size-5 dark:block" aria-hidden />
      <Moon className="size-5 dark:hidden" aria-hidden />
      <span className="sr-only dark:hidden">{strings.theme.switchToDark}</span>
      <span className="sr-only hidden dark:inline">{strings.theme.switchToLight}</span>
    </Button>
  );
}
