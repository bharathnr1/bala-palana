import { academicYearOf } from "./academic-year";

export type TimelineYearGroup<T> = {
  academicYear: string;
  rows: T[];
};

/**
 * The Journey tab's headings (04-ui-spec § Child profile): rows grouped under
 * the academic year they fall in, newest first. Rows must already be sorted
 * newest first, which is how the query returns them.
 */
export function groupTimelineByAcademicYear<T extends { at: Date }>(
  rows: readonly T[],
  startMonth: number,
): TimelineYearGroup<T>[] {
  const groups: TimelineYearGroup<T>[] = [];
  let current: TimelineYearGroup<T> | undefined;

  for (const row of rows) {
    const academicYear = academicYearOf(row.at, startMonth);
    if (!current || current.academicYear !== academicYear) {
      current = { academicYear, rows: [] };
      groups.push(current);
    }
    current.rows.push(row);
  }

  return groups;
}
