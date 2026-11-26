import { describe, expect, it } from "vitest";

import {
  addDaysISO,
  daysBetween,
  formatDate,
  formatDateOrDash,
  isOverdue,
  parseISODate,
  relativeDueLabel,
  todayISO,
} from "@/lib/dates";

describe("dates", () => {
  it("formats a date the way staff read it", () => {
    expect(formatDate("2026-11-24")).toBe("24 Nov 2026");
    expect(formatDateOrDash(null)).toBe("—");
  });

  it("treats an ISO date as midnight in India", () => {
    const date = parseISODate("2026-06-01");
    expect(date.getHours()).toBe(0);
    expect(date.getDate()).toBe(1);
    expect(date.toISOString()).toBe("2026-06-01T00:00:00.000+05:30");
  });

  it("adds calendar days across a month boundary in IST", () => {
    expect(addDaysISO("2026-11-24", 7)).toBe("2026-12-01");
    expect(addDaysISO("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysISO("2026-11-24", 0)).toBe("2026-11-24");
  });

  it("counts calendar days across a month boundary", () => {
    expect(daysBetween("2026-11-30", "2026-12-02")).toBe(2);
    expect(daysBetween("2026-12-02", "2026-11-30")).toBe(-2);
  });

  it("labels follow-up dates relatively", () => {
    const today = "2026-11-24";
    expect(relativeDueLabel(today, today)).toBe("Today");
    expect(relativeDueLabel("2026-11-25", today)).toBe("Tomorrow");
    expect(relativeDueLabel("2026-11-26", today)).toBe("in 2 days");
    expect(relativeDueLabel("2026-11-23", today)).toBe("1 day overdue");
    expect(relativeDueLabel("2026-11-22", today)).toBe("2 days overdue");
    expect(relativeDueLabel("2027-03-01", today)).toBe("1 Mar 2027");
  });

  it("knows when a due date has passed", () => {
    const today = "2026-11-24";
    expect(isOverdue("2026-11-23", today)).toBe(true);
    expect(isOverdue("2026-11-24", today)).toBe(false);
    expect(isOverdue("2026-11-25", today)).toBe(false);
  });

  it("returns today as an ISO date in IST", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
