/**
 * Light/dark theme. The choice is per device and stored in localStorage, like
 * "recently viewed" (M0-08); nothing about it reaches the server.
 *
 * The class on `<html>` is the single source of truth: the root layout starts
 * without `dark`, and an inline script adds it before the first paint, so a
 * stored dark choice never flashes light.
 */
export const THEME_STORAGE_KEY = "bp_theme";

export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];

/** Browser chrome colours: the values the background tokens resolve to. */
export const THEME_COLORS: Record<Theme, string> = {
  light: "#fbf7f2",
  dark: "#17110d",
};

/** Stored values are untrusted: anything but "dark" means the light default. */
export function parseTheme(value: string | null): Theme {
  return value === "dark" ? "dark" : "light";
}

export function flipTheme(theme: Theme): Theme {
  return theme === "dark" ? "light" : "dark";
}

/**
 * Runs in `<head>` before the first paint, so the stored choice is in place
 * before anything renders. It stays dependency-free on purpose: React and the
 * client bundle load too late to prevent a flash.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");var dark=t==="dark";document.documentElement.classList.toggle("dark",dark);var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",dark?"${THEME_COLORS.dark}":"${THEME_COLORS.light}")}}catch(e){}})();`;
