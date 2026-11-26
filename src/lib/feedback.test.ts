import { describe, expect, it } from "vitest";

import { childIdFromPath, formatDuration, pageContextLabel } from "./feedback";

describe("formatDuration", () => {
  it("formats seconds as minutes and padded seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(7)).toBe("0:07");
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(180)).toBe("3:00");
  });

  it("treats a missing duration as zero and never shows negatives", () => {
    expect(formatDuration(null)).toBe("0:00");
    expect(formatDuration(-4)).toBe("0:00");
  });
});

describe("pageContextLabel", () => {
  it("reads the route from the stored JSON", () => {
    expect(
      pageContextLabel(
        JSON.stringify({
          route: "/children/8a1d3f5e-1f0e-4b4d-9c33-3a2f3f3f3f3f",
          childId: "8a1d3f5e-1f0e-4b4d-9c33-3a2f3f3f3f3f",
        }),
      ),
    ).toBe("/children/8a1d3f5e-1f0e-4b4d-9c33-3a2f3f3f3f3f");
  });

  it("falls back to a plain stored path", () => {
    expect(pageContextLabel("/observe")).toBe("/observe");
  });

  it("returns an empty label for a missing value", () => {
    expect(pageContextLabel(null)).toBe("");
  });
});

describe("childIdFromPath", () => {
  const id = "8a1d3f5e-1f0e-4b4d-9c33-3a2f3f3f3f3f";

  it("reads the id from a child profile and its child routes", () => {
    expect(childIdFromPath(`/children/${id}`)).toBe(id);
    expect(childIdFromPath(`/children/${id}/edit`)).toBe(id);
  });

  it("returns nothing for other routes", () => {
    expect(childIdFromPath("/")).toBeUndefined();
    expect(childIdFromPath("/children")).toBeUndefined();
    expect(childIdFromPath(`/child/${id}`)).toBeUndefined();
  });
});
