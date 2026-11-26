import { describe, expect, it } from "vitest";

import { groupTimelineByAcademicYear } from "./timeline";

const at = (iso: string) => new Date(iso);

describe("groupTimelineByAcademicYear", () => {
  it("splits rows at the academic-year boundary and keeps newest first", () => {
    // 18:00 UTC on 31 May is 23:30 IST, still the 2025-26 year (D15).
    const rows = [
      { id: "new", at: at("2026-06-01T04:00:00Z") },
      { id: "old", at: at("2026-05-31T18:00:00Z") },
      { id: "older", at: at("2025-06-10T04:00:00Z") },
    ];

    const groups = groupTimelineByAcademicYear(rows, 6);

    expect(groups.map((group) => group.academicYear)).toEqual(["2026-27", "2025-26"]);
    expect(groups[1]?.rows.map((row) => row.id)).toEqual(["old", "older"]);
  });

  it("keeps a single group when every row falls in one year", () => {
    const rows = [at("2026-07-01T04:00:00Z"), at("2027-03-01T04:00:00Z")].map((date, index) => ({
      id: String(index),
      at: date,
    }));

    expect(groupTimelineByAcademicYear(rows, 6)).toHaveLength(1);
  });

  it("uses the configured start month", () => {
    const rows = [{ id: "jan", at: at("2027-01-10T04:00:00Z") }];

    expect(groupTimelineByAcademicYear(rows, 6)[0]?.academicYear).toBe("2026-27");
    expect(groupTimelineByAcademicYear(rows, 1)[0]?.academicYear).toBe("2027-28");
  });

  it("returns nothing for an empty timeline", () => {
    expect(groupTimelineByAcademicYear([], 6)).toEqual([]);
  });
});
