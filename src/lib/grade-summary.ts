/**
 * The grade summary's chart data (M4-04): one average per subject, weighted by
 * how many assessments each class-row is based on. Pure, so the arithmetic is
 * unit-tested independently of the view.
 */

export type SummaryRow = { subject: string; avgPct: number; n: number };

export type SubjectAverage = { subject: string; pct: number; n: number };

export function subjectAverages(rows: readonly SummaryRow[]): SubjectAverage[] {
  const bySubject = new Map<string, { total: number; n: number }>();

  for (const row of rows) {
    const entry = bySubject.get(row.subject) ?? { total: 0, n: 0 };
    entry.total += row.avgPct * row.n;
    entry.n += row.n;
    bySubject.set(row.subject, entry);
  }

  return [...bySubject.entries()]
    .map(([subject, { total, n }]) => ({
      subject,
      pct: n === 0 ? 0 : Math.round((total / n) * 10) / 10,
      n,
    }))
    .sort((a, b) => a.subject.localeCompare(b.subject));
}
