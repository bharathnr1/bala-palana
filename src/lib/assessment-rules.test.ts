import { describe, expect, it } from "vitest";

import { isBlankValues, validateAssessmentValues } from "./assessment-rules";
import { strings } from "./strings";

const blank = { marks: "", maxMarks: "100", gradeLetter: "", remark: "" };

describe("validateAssessmentValues", () => {
  it("accepts marks within the maximum", () => {
    expect(validateAssessmentValues({ ...blank, marks: "87.5" })).toEqual({});
  });

  it("accepts a grade letter or a remark alone", () => {
    expect(validateAssessmentValues({ ...blank, gradeLetter: "A" })).toEqual({});
    expect(validateAssessmentValues({ ...blank, remark: "Improving." })).toEqual({});
  });

  it("rejects text that is not a number", () => {
    expect(validateAssessmentValues({ ...blank, marks: "eighty" }).marks).toBe(
      strings.academics.errors.markRange,
    );
  });

  it("rejects marks above the maximum", () => {
    expect(validateAssessmentValues({ ...blank, marks: "101" }).marks).toBe(
      strings.academics.errors.marksAboveMax,
    );
  });

  it("rejects an empty row and long free text", () => {
    expect(
      validateAssessmentValues({ marks: "", maxMarks: "", gradeLetter: "", remark: "" }).form,
    ).toBe(strings.academics.errors.emptyValue);
    expect(validateAssessmentValues({ ...blank, gradeLetter: "A".repeat(11) }).gradeLetter).toBe(
      strings.academics.errors.gradeLetterTooLong,
    );
    expect(validateAssessmentValues({ ...blank, remark: "x".repeat(501) }).remark).toBe(
      strings.academics.errors.remarkTooLong,
    );
  });
});

describe("isBlankValues", () => {
  it("treats a row with only a maximum as blank", () => {
    expect(isBlankValues(blank)).toBe(true);
    expect(isBlankValues({ ...blank, marks: "0" })).toBe(false);
  });
});
