import { describe, expect, it } from "vitest";

import { academicYearEnd, academicYearOf, academicYearStart } from "@/lib/academic-year";

describe("academicYearOf", () => {
  it("starts a new year on 1 June (D15)", () => {
    expect(academicYearOf("2026-05-31", 6)).toBe("2025-26");
    expect(academicYearOf("2026-06-01", 6)).toBe("2026-27");
    expect(academicYearOf("2026-12-31", 6)).toBe("2026-27");
    expect(academicYearOf("2027-01-01", 6)).toBe("2026-27");
  });

  it("uses June by default", () => {
    expect(academicYearOf("2026-05-31")).toBe("2025-26");
  });

  it("respects a different start month", () => {
    expect(academicYearOf("2026-03-31", 4)).toBe("2025-26");
    expect(academicYearOf("2026-04-01", 4)).toBe("2026-27");
  });

  it("pads the second year and rejects bad months", () => {
    expect(academicYearOf("2026-09-01", 9)).toBe("2026-27");
    expect(academicYearOf("2009-06-01", 6)).toBe("2009-10");
    expect(academicYearOf("2029-06-01", 6)).toBe("2029-30");
    expect(() => academicYearOf("2026-06-01", 0)).toThrow(RangeError);
    expect(() => academicYearOf("2026-06-01", 13)).toThrow(RangeError);
  });

  it("returns the year's first and last day", () => {
    expect(academicYearStart("2026-27", 6)).toBe("2026-06-01");
    expect(academicYearEnd("2026-27", 6)).toBe("2027-05-31");
    expect(academicYearEnd("2026-27", 4)).toBe("2027-03-31");
    expect(academicYearEnd("2026-27", 1)).toBe("2026-12-31");
  });
});
