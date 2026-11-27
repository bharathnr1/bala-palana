import { EmptyState } from "@/components/empty-state";
import type { ProgressCell, YearProgress } from "@/lib/academic-progress";
import { strings } from "@/lib/strings";
import type { SubjectConcern } from "@/server/academics/queries";

import { SubjectSparkline } from "./subject-sparkline";

function cellText(cell: ProgressCell): string {
  if (!cell) return strings.academics.tab.notRecorded;
  if (cell.kind === "text") return cell.text;
  return `${cell.marks}/${cell.maxMarks} · ${cell.pct}%`;
}

/**
 * The Academics tab (M4-03): per academic year a subject × term table, the
 * percentage trend per subject, and the child's open concerns by subject.
 */
export function AcademicsTab({
  years,
  concerns,
}: {
  years: YearProgress[];
  concerns: SubjectConcern[];
}) {
  if (years.length === 0 && concerns.length === 0) {
    return <EmptyState title={strings.academics.tab.noData} />;
  }

  return (
    <div className="space-y-8">
      {years.map((year) => {
        const trends = year.trends.filter((trend) => trend.points.length >= 2);
        return (
          <section key={year.academicYear} aria-labelledby={`academics-${year.academicYear}`}>
            <h3
              id={`academics-${year.academicYear}`}
              className="text-muted-foreground mb-2 text-sm font-semibold"
            >
              {year.academicYear}
            </h3>

            <div className="border-border overflow-x-auto rounded-xl border">
              <table className="w-full min-w-max border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th
                      scope="col"
                      className="bg-muted sticky left-0 px-3 py-2 text-left font-medium"
                    >
                      {strings.academics.subject}
                    </th>
                    {year.terms.map((term) => (
                      <th key={term.key} scope="col" className="px-3 py-2 text-left font-medium">
                        {term.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {year.subjects.map((subject) => (
                    <tr key={subject.subjectKey} className="border-border border-t">
                      <th
                        scope="row"
                        className="bg-background sticky left-0 px-3 py-2 text-left font-medium"
                      >
                        {subject.subjectLabel}
                      </th>
                      {year.terms.map((term) => (
                        <td key={term.key} className="text-muted-foreground px-3 py-2">
                          {cellText(subject.cells[term.key] ?? null)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {trends.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {trends.map((trend) => (
                  <li key={trend.subjectKey}>
                    <SubjectSparkline label={trend.subjectLabel} points={trend.points} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}

      {concerns.length > 0 ? (
        <section aria-labelledby="academics-concerns">
          <h3 id="academics-concerns" className="text-muted-foreground mb-2 text-sm font-semibold">
            {strings.academics.tab.concernsTitle}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {concerns.map((concern) => (
              <li
                key={concern.subjectKey ?? "none"}
                className="border-border inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm"
              >
                <span>{concern.subjectLabel ?? strings.academics.tab.noSubject}</span>
                <span className="bg-secondary text-secondary-foreground rounded-full px-2 text-xs">
                  {concern.openCount}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
