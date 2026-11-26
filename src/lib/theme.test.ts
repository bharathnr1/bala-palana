import { describe, expect, it } from "vitest";

import { flipTheme, parseTheme, THEME_COLORS, THEMES } from "./theme";

describe("theme preference", () => {
  it("defaults to dark when nothing is stored", () => {
    expect(parseTheme(null)).toBe("dark");
  });

  it("honours a stored light choice and treats anything else as dark", () => {
    expect(parseTheme("light")).toBe("light");
    expect(parseTheme("dark")).toBe("dark");
    expect(parseTheme("system")).toBe("dark");
    expect(parseTheme("")).toBe("dark");
  });

  it("flips between the two themes", () => {
    expect(flipTheme("dark")).toBe("light");
    expect(flipTheme("light")).toBe("dark");
  });

  it("has a browser chrome colour for every theme", () => {
    for (const theme of THEMES) {
      expect(THEME_COLORS[theme]).toMatch(/^#[0-9a-f]{6}$/);
    }
  });
});
