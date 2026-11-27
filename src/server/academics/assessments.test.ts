import { describe, expect, it } from "vitest";

import { strings } from "@/lib/strings";

import { upsertAssessmentSchema } from "./mutations";

const base = {
  childId: "2e5b1e0a-1f1d-4b4c-9d3f-6f4c0f6a2b17",
  academicYear: "2026-27",
  gradeKey: "grade_5",
  termKey: "term_1",
  subjectKey: "mathematics",
};

function parse(overrides: Record<string, unknown>) {
  return upsertAssessmentSchema.safeParse({ ...base, ...overrides });
}

describe("upsertAssessmentSchema", () => {
  it("accepts form strings and turns a blank into null", () => {
    const result = parse({ marks: "85.5", maxMarks: "100", remark: "  " });
    if (!result.success) throw new Error("expected a valid assessment");
    expect(result.data.marks).toBe(85.5);
    expect(result.data.maxMarks).toBe(100);
    expect(result.data.remark).toBeUndefined();
  });

  it("accepts a grade letter alone and a remark alone (D10)", () => {
    expect(parse({ gradeLetter: "A" }).success).toBe(true);
    expect(parse({ remark: "Improving steadily." }).success).toBe(true);
    expect(parse({ marks: 60, gradeLetter: "B" }).success).toBe(true);
  });

  it("refuses a row with no value at all", () => {
    const result = parse({});
    if (result.success) throw new Error("expected a rejected row");
    expect(result.error.issues[0]?.message).toBe(strings.academics.errors.emptyValue);
  });

  it("refuses marks above the maximum and negative marks", () => {
    const above = parse({ marks: 90, maxMarks: 80 });
    if (above.success) throw new Error("expected a rejected row");
    expect(above.error.issues[0]?.message).toBe(strings.academics.errors.marksAboveMax);

    expect(parse({ marks: -1 }).success).toBe(false);
  });

  it("refuses a malformed academic year", () => {
    expect(parse({ remark: "Ok", academicYear: "2026" }).success).toBe(false);
  });
});
