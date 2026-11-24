import { describe, expect, it } from "vitest";

import { categoryFlags, entryDetailsSchema, parseEntryDetails } from "./categories";

const uuid = "9f8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

describe("parseEntryDetails", () => {
  it("accepts the shape each category declares", () => {
    expect(parseEntryDetails("academic", { termId: uuid })).toEqual({
      ok: true,
      details: { termId: uuid },
    });
    expect(
      parseEntryDetails("achievement", { event: "Bhajan competition", levelId: uuid, resultId: uuid }),
    ).toEqual({
      ok: true,
      details: { event: "Bhajan competition", levelId: uuid, resultId: uuid },
    });
    expect(parseEntryDetails("responsibility", { title: "Team captain", from: "2026-06-01" })).toEqual({
      ok: true,
      details: { title: "Team captain", from: "2026-06-01" },
    });
  });

  it("rejects a field the category does not declare", () => {
    const result = parseEntryDetails("observation", { subject: "maths" });
    expect(result.ok).toBe(false);
  });

  it("treats a missing details field as empty", () => {
    expect(parseEntryDetails("concern", undefined)).toEqual({ ok: true, details: {} });
  });

  it("gives an admin-added category empty details and drops what it was sent", () => {
    expect(parseEntryDetails("house_point", { anything: true })).toEqual({ ok: true, details: {} });
    expect(entryDetailsSchema("house_point").safeParse({}).success).toBe(true);
  });
});

describe("categoryFlags", () => {
  it("reads the lookup meta flags", () => {
    expect(categoryFlags({ restricted: true, opens_follow_up: true })).toEqual({
      restricted: true,
      opensFollowUp: true,
    });
  });

  it("defaults to visible and no follow-up for unknown meta", () => {
    expect(categoryFlags({ restricted: "yes", opens_follow_up: 1 })).toEqual({
      restricted: false,
      opensFollowUp: false,
    });
  });
});
