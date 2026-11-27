import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GradeSummaryChart } from "@/features/reports/grade-summary-chart";
import { shiftAcademicYear } from "@/lib/academic-year";
import { subjectAverages } from "@/lib/grade-summary";
import { strings } from "@/lib/strings";
import { gradeSubjectSummary, reportLookups } from "@/server/reports/queries";
import { requireScreen } from "@/server/auth/guards";
import { currentAcademicYear } from "@/server/children/queries";

export const metadata: Metadata = { title: strings.reports.gradeSummary.title };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const SELECT = "h-11 w-full rounded-lg border border-input bg-background px-2";

/**
 * Grade / group summary (M4-04, design § 7): per-subject averages by term,
 * with a chart, the table behind it and a CSV download that takes the same
 * filters. The generic exporter arrives in M8-03.
 */
export default async function GradeSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("report.read");
  const params = await searchParams;

  const [lookups, currentYear] = await Promise.all([reportLookups(user), currentAcademicYear()]);

  const years = [0, -1, -2].map((by) => shiftAcademicYear(currentYear, by));
  const requestedYear = first(params.year);
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : currentYear;

  // An unknown label falls back to "all", the same as the select shows.
  const grade = lookups.grades.find((label) => label === first(params.grade));
  const term = lookups.terms.find((label) => label === first(params.term));

  const rows = await gradeSubjectSummary(user, { academicYear: year, grade, term });
  const chartRows = subjectAverages(rows);

  const exportParams = new URLSearchParams({ year });
  if (grade) exportParams.set("grade", grade);
  if (term) exportParams.set("term", term);
  const exportHref = `/reports/grade-summary/export?${exportParams.toString()}`;

  return (
    <>
      <PageHeader
        title={strings.reports.gradeSummary.title}
        description={strings.reports.gradeSummary.hint}
        actions={
          <Button asChild variant="outline" className="h-11">
            <a href={exportHref} download>
              {strings.reports.gradeSummary.export}
            </a>
          </Button>
        }
      />

      <form method="get" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:items-end">
        <div>
          <label htmlFor="summary-year" className="text-muted-foreground text-xs">
            {strings.reports.filters.year}
          </label>
          <select id="summary-year" name="year" defaultValue={year} className={SELECT}>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="summary-grade" className="text-muted-foreground text-xs">
            {strings.reports.filters.grade}
          </label>
          <select id="summary-grade" name="grade" defaultValue={grade ?? ""} className={SELECT}>
            <option value="">{strings.reports.filters.all}</option>
            {lookups.grades.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="summary-term" className="text-muted-foreground text-xs">
            {strings.reports.filters.term}
          </label>
          <select id="summary-term" name="term" defaultValue={term ?? ""} className={SELECT}>
            <option value="">{strings.reports.filters.all}</option>
            {lookups.terms.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="col-span-2 h-11 sm:col-span-1">
          {strings.reports.filters.show}
        </Button>
      </form>

      {rows.length === 0 ? (
        <EmptyState title={strings.reports.gradeSummary.empty} />
      ) : (
        <div className="space-y-6">
          <section aria-labelledby="summary-chart">
            <h2 id="summary-chart" className="text-muted-foreground mb-2 text-sm font-semibold">
              {strings.reports.gradeSummary.chart}
            </h2>
            <GradeSummaryChart rows={chartRows} />
          </section>

          <div className="border-border overflow-x-auto rounded-xl border">
            <table className="w-full min-w-max border-collapse text-sm">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {strings.reports.gradeSummary.columns.grade}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {strings.reports.gradeSummary.columns.term}
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium">
                    {strings.reports.gradeSummary.columns.subject}
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">
                    {strings.reports.gradeSummary.columns.average}
                  </th>
                  <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">
                    {strings.reports.gradeSummary.columns.count}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.grade}-${row.term}-${row.subject}`}
                    className="border-border border-t"
                  >
                    <td className="px-3 py-2">{row.grade || "—"}</td>
                    <td className="px-3 py-2">{row.term || "—"}</td>
                    <td className="px-3 py-2">{row.subject || "—"}</td>
                    <td className="px-3 py-2 text-right">{row.avgPct}%</td>
                    <td className="text-muted-foreground hidden px-3 py-2 text-right sm:table-cell">
                      {row.n}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p>
            <Link href="/reports" className="text-sm underline-offset-4 hover:underline">
              {strings.reports.title}
            </Link>
          </p>
        </div>
      )}
    </>
  );
}
