import { afterEach, describe, expect, it, vi } from "vitest";

import { todayISO } from "./dates";
import { followUpBucket, groupFollowUps, withinDays } from "./follow-ups";

afterEach(() => {
  vi.useRealTimers();
});

describe("followUpBucket", () => {
  const today = "2026-11-26";

  it("splits overdue, today and upcoming", () => {
    expect(followUpBucket("2026-11-25", today)).toBe("overdue");
    expect(followUpBucket("2026-11-26", today)).toBe("today");
    expect(followUpBucket("2026-11-27", today)).toBe("upcoming");
  });

  it("calls a follow-up due on the IST day today at 23:30 UTC", () => {
    // The suite runs in UTC; 23:30 UTC on the 25th is already the 26th in India.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-25T23:30:00Z"));

    expect(todayISO()).toBe("2026-11-26");
    expect(followUpBucket("2026-11-26")).toBe("today");
    expect(followUpBucket("2026-11-25")).toBe("overdue");
  });
});

describe("groupFollowUps", () => {
  it("keeps the rows in the order the query returned them", () => {
    const rows = [
      { id: "a", followUpOn: "2026-11-20" },
      { id: "b", followUpOn: "2026-11-26" },
      { id: "c", followUpOn: "2026-12-02" },
    ];

    const grouped = groupFollowUps(rows, "2026-11-26");

    expect(grouped.overdue.map((row) => row.id)).toEqual(["a"]);
    expect(grouped.today.map((row) => row.id)).toEqual(["b"]);
    expect(grouped.upcoming.map((row) => row.id)).toEqual(["c"]);
  });
});

describe("withinDays", () => {
  it("includes today and the next seven days only", () => {
    expect(withinDays("2026-11-26", 7, "2026-11-26")).toBe(true);
    expect(withinDays("2026-12-03", 7, "2026-11-26")).toBe(true);
    expect(withinDays("2026-12-04", 7, "2026-11-26")).toBe(false);
    expect(withinDays("2026-11-25", 7, "2026-11-26")).toBe(false);
  });
});
