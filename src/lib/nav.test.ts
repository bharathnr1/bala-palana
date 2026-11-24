import { describe, expect, it } from "vitest";

import { mobilePrimaryFor, NAV_ITEMS, navFor } from "./nav";
import { ROLES } from "./permissions";

const hrefsFor = (role: (typeof ROLES)[number]) => navFor({ role }).map((item) => item.href);

describe("signed-in navigation", () => {
  it("hides admissions, fees, reports and settings from a teacher (M0-07)", () => {
    const hrefs = hrefsFor("teacher");
    expect(hrefs).not.toContain("/admissions");
    expect(hrefs).not.toContain("/fees/pending");
    expect(hrefs).not.toContain("/reports");
    expect(hrefs).not.toContain("/settings");
  });

  it("shows every item to an admin", () => {
    expect(hrefsFor("admin")).toHaveLength(NAV_ITEMS.length);
  });

  it("gives management its read-only screens but no settings", () => {
    const hrefs = hrefsFor("management");
    expect(hrefs).toEqual(
      expect.arrayContaining(["/", "/children", "/admissions", "/fees/pending", "/reports"]),
    );
    expect(hrefs).not.toContain("/settings");
    expect(hrefs).not.toContain("/observe");
  });

  it("keeps the mobile primary bar to allowed items for every role", () => {
    for (const role of ROLES) {
      const primary = mobilePrimaryFor({ role }).map((item) => item.href);
      const allowed = new Set(navFor({ role }).map((item) => item.href));
      expect(primary.every((href) => allowed.has(href))).toBe(true);
      expect(primary).toContain("/");
      expect(primary).toContain("/children");
      expect(primary).toContain("/duties");
    }

    // Management cannot create entries, so Observe is hidden from its bar too.
    expect(mobilePrimaryFor({ role: "management" }).map((item) => item.href)).toEqual([
      "/",
      "/children",
      "/duties",
    ]);
    expect(mobilePrimaryFor({ role: "teacher" }).map((item) => item.href)).toEqual([
      "/",
      "/children",
      "/observe",
      "/duties",
    ]);
  });

  it("never lists the same route twice", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});
