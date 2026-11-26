import { describe, expect, it } from "vitest";

import { canSplitAt, cyclePeriods, daysInMonth, ensureWindow, periodsOverlap } from "./cycles";

describe("cyclePeriods (half_month)", () => {
  it("splits February in a common year", () => {
    expect(cyclePeriods("half_month", "2027-02-01", "2027-02-28")).toEqual([
      { startOn: "2027-02-01", endOn: "2027-02-15" },
      { startOn: "2027-02-16", endOn: "2027-02-28" },
    ]);
  });

  it("splits February in a leap year", () => {
    expect(cyclePeriods("half_month", "2028-02-01", "2028-02-29")).toEqual([
      { startOn: "2028-02-01", endOn: "2028-02-15" },
      { startOn: "2028-02-16", endOn: "2028-02-29" },
    ]);
  });

  it("splits a 30-day month", () => {
    expect(cyclePeriods("half_month", "2027-04-01", "2027-04-30")).toEqual([
      { startOn: "2027-04-01", endOn: "2027-04-15" },
      { startOn: "2027-04-16", endOn: "2027-04-30" },
    ]);
  });

  it("splits a 31-day month", () => {
    expect(cyclePeriods("half_month", "2027-05-01", "2027-05-31")).toEqual([
      { startOn: "2027-05-01", endOn: "2027-05-15" },
      { startOn: "2027-05-16", endOn: "2027-05-31" },
    ]);
  });

  it("covers a long range without gaps or overlaps", () => {
    const periods = cyclePeriods("half_month", "2026-11-01", "2027-02-28");

    expect(periods).toHaveLength(8);
    for (let index = 1; index < periods.length; index += 1) {
      const previous = periods[index - 1];
      const current = periods[index];
      if (!previous || !current) throw new Error("missing period");
      // One cycle ends before the next one starts, with no day in both.
      expect(previous.endOn < current.startOn).toBe(true);
      expect(periodsOverlap(previous, current)).toBe(false);
    }
  });

  it("returns whole cycles when the range starts and ends mid-cycle", () => {
    expect(cyclePeriods("half_month", "2027-03-10", "2027-03-20")).toEqual([
      { startOn: "2027-03-01", endOn: "2027-03-15" },
      { startOn: "2027-03-16", endOn: "2027-03-31" },
    ]);
  });
});

describe("daysInMonth", () => {
  it("knows the leap years", () => {
    expect(daysInMonth(2027, 2)).toBe(28);
    expect(daysInMonth(2028, 2)).toBe(29);
    expect(daysInMonth(2027, 4)).toBe(30);
    expect(daysInMonth(2027, 5)).toBe(31);
  });
});

describe("ensureWindow", () => {
  it("runs from the first of this month to the last day two months ahead", () => {
    expect(ensureWindow("2026-11-26")).toEqual({ startOn: "2026-11-01", endOn: "2027-01-31" });
  });

  it("crosses the year boundary", () => {
    expect(ensureWindow("2026-12-05")).toEqual({ startOn: "2026-12-01", endOn: "2027-02-28" });
  });
});

describe("canSplitAt", () => {
  it("accepts a day inside the cycle and refuses the first day and after the end", () => {
    const period = { startOn: "2027-03-01", endOn: "2027-03-15" };

    expect(canSplitAt(period, "2027-03-08")).toBe(true);
    expect(canSplitAt(period, "2027-03-01")).toBe(false);
    expect(canSplitAt(period, "2027-03-16")).toBe(false);
  });
});
