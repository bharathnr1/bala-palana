import { describe, expect, it } from "vitest";

import { subjectAverages } from "./grade-summary";

describe("subjectAverages", () => {
  it("weights each class-row's average by its assessment count", () => {
    // (80 × 3 + 90 × 1) ÷ 4 = 82.5
    const averages = subjectAverages([
      { subject: "Mathematics", avgPct: 80, n: 3 },
      { subject: "Mathematics", avgPct: 90, n: 1 },
      { subject: "English", avgPct: 66.7, n: 3 },
    ]);

    expect(averages).toEqual([
      { subject: "English", pct: 66.7, n: 3 },
      { subject: "Mathematics", pct: 82.5, n: 4 },
    ]);
  });

  it("returns nothing for no rows", () => {
    expect(subjectAverages([])).toEqual([]);
  });
});
