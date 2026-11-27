import { describe, expect, it } from "vitest";

import { groupAssessmentsByYear, percentageOf, type ProgressRow } from "./academic-progress";

function row(overrides: Partial<ProgressRow>): ProgressRow {
  return {
    academicYear: "2026-27",
    termKey: "term_1",
    termLabel: "Term 1",
    subjectKey: "mathematics",
    subjectLabel: "Mathematics",
    marks: null,
    maxMarks: null,
    gradeLetter: null,
    remark: null,
    ...overrides,
  };
}

describe("percentageOf", () => {
  it("rounds to one decimal and refuses a missing or zero maximum", () => {
    expect(percentageOf(80, 100)).toBe(80);
    expect(percentageOf(2, 3)).toBe(66.7);
    expect(percentageOf(80, 0)).toBeNull();
    expect(percentageOf(null, 100)).toBeNull();
  });
});

describe("groupAssessmentsByYear", () => {
  it("builds a subject × term table with marks, letters and remarks in one cell", () => {
    const years = groupAssessmentsByYear([
      row({ subjectKey: "english", subjectLabel: "English", gradeLetter: "A" }),
      row({ termKey: "term_2", termLabel: "Term 2", marks: 45, maxMarks: 50 }),
      row({ termKey: "term_2", termLabel: "Term 2", subjectKey: "english", subjectLabel: "English", remark: "Improving." }),
    ]);

    expect(years).toHaveLength(1);
    const year = years[0]!;
    expect(year.terms.map((term) => term.label)).toEqual(["Term 1", "Term 2"]);
    expect(year.subjects.map((subject) => subject.subjectLabel)).toEqual(["English", "Mathematics"]);
    expect(year.subjects[0]?.cells.term_1).toEqual({ kind: "text", text: "A" });
    expect(year.subjects[0]?.cells.term_2).toEqual({ kind: "text", text: "Improving." });
    expect(year.subjects[1]?.cells.term_2).toEqual({
      kind: "marks",
      marks: 45,
      maxMarks: 50,
      pct: 90,
    });
  });

  it("keeps years newest first and trends only across percentage rows", () => {
    const years = groupAssessmentsByYear([
      row({ academicYear: "2026-27", marks: 70, maxMarks: 100 }),
      row({ academicYear: "2025-26", marks: 60, maxMarks: 100 }),
    ]);

    expect(years.map((year) => year.academicYear)).toEqual(["2026-27", "2025-26"]);
    expect(years[0]?.trends[0]?.points).toEqual([{ termLabel: "Term 1", pct: 70 }]);
  });

  it("orders a subject's points by term even when the term order is not the data order", () => {
    const years = groupAssessmentsByYear([
      row({ termKey: "term_1", termLabel: "Term 1", marks: 60, maxMarks: 100 }),
      row({ termKey: "term_2", termLabel: "Term 2", marks: 75, maxMarks: 100 }),
    ]);

    expect(years[0]?.trends[0]?.points.map((point) => point.pct)).toEqual([60, 75]);
  });
});
