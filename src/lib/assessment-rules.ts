import { strings } from "./strings";

/** What one row of the academics form holds, before it becomes a number. */
export type AssessmentValues = {
  marks: string;
  maxMarks: string;
  gradeLetter: string;
  remark: string;
};

export type AssessmentErrors = {
  marks?: string;
  maxMarks?: string;
  gradeLetter?: string;
  remark?: string;
  form?: string;
};

const MAX_MARK = 9999.99;

function parseMark(value: string): number | null | undefined {
  const text = value.trim();
  if (text === "") return null;
  const parsed = Number(text);
  return Number.isNaN(parsed) ? undefined : parsed;
}

/**
 * The row-level rules from D10, as the form shows them. The server repeats
 * them authoritatively (Zod and the database checks); this copy only exists so
 * a bad mark is caught before an autosave round-trip.
 */
export function validateAssessmentValues(values: AssessmentValues): AssessmentErrors {
  const errors: AssessmentErrors = {};
  const marks = parseMark(values.marks);
  const maxMarks = parseMark(values.maxMarks);

  if (values.marks.trim() !== "" && (marks == null || marks < 0 || marks > MAX_MARK)) {
    errors.marks = strings.academics.errors.markRange;
  }
  if (
    values.maxMarks.trim() !== "" &&
    (maxMarks == null || maxMarks < 0 || maxMarks > MAX_MARK)
  ) {
    errors.maxMarks = strings.academics.errors.markRange;
  }
  if (marks != null && maxMarks != null && marks > maxMarks) {
    errors.marks = strings.academics.errors.marksAboveMax;
  }
  if (values.gradeLetter.trim().length > 10) {
    errors.gradeLetter = strings.academics.errors.gradeLetterTooLong;
  }
  if (values.remark.trim().length > 500) {
    errors.remark = strings.academics.errors.remarkTooLong;
  }
  if (
    Object.keys(errors).length === 0 &&
    values.marks.trim() === "" &&
    values.gradeLetter.trim() === "" &&
    values.remark.trim() === ""
  ) {
    errors.form = strings.academics.errors.emptyValue;
  }

  return errors;
}

/** A row with nothing recorded: clearing it means removing an existing row. */
export function isBlankValues(values: AssessmentValues): boolean {
  return (
    values.marks.trim() === "" &&
    values.gradeLetter.trim() === "" &&
    values.remark.trim() === ""
  );
}
