/**
 * Turns a child's assessment rows into the Academics tab's shape (M4-03):
 * one table per academic year (subjects against terms) and a percentage trend
 * per subject. Pure, so the arithmetic is tested without a database.
 */

export type ProgressRow = {
  academicYear: string;
  termKey: string;
  termLabel: string;
  subjectKey: string;
  subjectLabel: string;
  marks: number | null;
  maxMarks: number | null;
  gradeLetter: string | null;
  remark: string | null;
};

export type ProgressCell =
  | { kind: "marks"; marks: number; maxMarks: number; pct: number }
  | { kind: "text"; text: string }
  | null;

export type SubjectRow = {
  subjectKey: string;
  subjectLabel: string;
  cells: Record<string, ProgressCell>;
};

export type SubjectTrend = {
  subjectKey: string;
  subjectLabel: string;
  points: { termLabel: string; pct: number }[];
};

export type YearProgress = {
  academicYear: string;
  terms: { key: string; label: string }[];
  subjects: SubjectRow[];
  trends: SubjectTrend[];
};

/** Marks as a percentage with one decimal, or null when it cannot be computed. */
export function percentageOf(marks: number | null, maxMarks: number | null): number | null {
  if (marks == null || maxMarks == null || maxMarks <= 0) return null;
  return Math.round((marks / maxMarks) * 1000) / 10;
}

function cellFor(row: ProgressRow): ProgressCell {
  const pct = percentageOf(row.marks, row.maxMarks);
  if (pct != null) {
    return { kind: "marks", marks: row.marks ?? 0, maxMarks: row.maxMarks ?? 0, pct };
  }
  const text = row.gradeLetter ?? row.remark;
  return text ? { kind: "text", text } : null;
}

/**
 * Rows must arrive newest year first, then term and subject order — which is
 * how `listChildAssessments` returns them. The first-seen order is kept.
 */
export function groupAssessmentsByYear(rows: readonly ProgressRow[]): YearProgress[] {
  const years: YearProgress[] = [];
  const byYear = new Map<string, YearProgress>();
  const termsSeen = new Map<string, Set<string>>();

  for (const row of rows) {
    let year = byYear.get(row.academicYear);
    if (!year) {
      year = { academicYear: row.academicYear, terms: [], subjects: [], trends: [] };
      byYear.set(row.academicYear, year);
      termsSeen.set(row.academicYear, new Set());
      years.push(year);
    }

    const seen = termsSeen.get(row.academicYear);
    if (seen && !seen.has(row.termKey)) {
      seen.add(row.termKey);
      year.terms.push({ key: row.termKey, label: row.termLabel });
    }

    let subject = year.subjects.find((entry) => entry.subjectKey === row.subjectKey);
    if (!subject) {
      subject = { subjectKey: row.subjectKey, subjectLabel: row.subjectLabel, cells: {} };
      year.subjects.push(subject);
    }
    subject.cells[row.termKey] = cellFor(row);
  }

  for (const year of years) {
    for (const subject of year.subjects) {
      const points = year.terms.flatMap((term) => {
        const cell = subject.cells[term.key];
        return cell?.kind === "marks" ? [{ termLabel: term.label, pct: cell.pct }] : [];
      });
      if (points.length > 0) {
        year.trends.push({
          subjectKey: subject.subjectKey,
          subjectLabel: subject.subjectLabel,
          points,
        });
      }
    }
  }

  return years;
}
