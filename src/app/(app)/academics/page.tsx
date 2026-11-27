import type { Metadata } from "next";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { BulkEntry, type BulkEntryRow } from "@/features/academics/bulk-entry";
import { shiftAcademicYear } from "@/lib/academic-year";
import { can } from "@/lib/permissions";
import { strings } from "@/lib/strings";
import {
  assessmentOptions,
  listClassAssessments,
  listClassChildren,
} from "@/server/academics/queries";
import { requireScreen } from "@/server/auth/guards";
import { currentAcademicYear } from "@/server/children/queries";

export const metadata: Metadata = { title: strings.nav.academics };

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const SELECT = "h-11 w-full rounded-lg border border-input bg-background px-2";

/**
 * Bulk entry (M4-02, 04-ui-spec § Academics): year, grade, term and subject on
 * top; one autosaving row per child below. The picker is a plain GET form, so
 * the screen needs no client JavaScript until a class is chosen.
 */
export default async function AcademicsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireScreen("assessment.read");
  const params = await searchParams;
  const canWrite = can(user, "assessment.write");

  const [options, currentYear] = await Promise.all([
    assessmentOptions(user),
    currentAcademicYear(),
  ]);

  // The last three academic years, like the profile's year chips.
  const years = [0, -1, -2].map((by) => shiftAcademicYear(currentYear, by));
  const requestedYear = first(params.year);
  const year = requestedYear && years.includes(requestedYear) ? requestedYear : currentYear;

  // An unknown key falls back to "not chosen", the same way the chip does.
  const gradeKey = options.grades.find((row) => row.key === first(params.grade))?.key;
  const termKey = options.terms.find((row) => row.key === first(params.term))?.key;
  const subjectKey = options.subjects.find((row) => row.key === first(params.subject))?.key;
  const complete = Boolean(gradeKey && termKey && subjectKey);

  const [children, existing] = complete
    ? await Promise.all([
        listClassChildren(user, { academicYear: year, gradeKey: gradeKey ?? "" }),
        listClassAssessments(user, {
          academicYear: year,
          gradeKey: gradeKey ?? "",
          termKey: termKey ?? "",
          subjectKey,
        }),
      ])
    : [[], []];

  const savedByChild = new Map(existing.map((row) => [row.childId, row]));
  // "Max remembered per subject/term": the latest maximum recorded for this
  // class, offered to every child who has none yet.
  const rememberedMax =
    existing
      .filter((row) => row.maxMarks != null)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())[0]?.maxMarks ?? null;

  const rows: BulkEntryRow[] = children.map((row) => {
    const saved = savedByChild.get(row.id);
    return {
      childId: row.id,
      childName: row.fullName,
      id: saved?.id ?? null,
      values: {
        marks: saved?.marks != null ? String(saved.marks) : "",
        maxMarks:
          saved?.maxMarks != null
            ? String(saved.maxMarks)
            : rememberedMax != null
              ? String(rememberedMax)
              : "",
        gradeLetter: saved?.gradeLetter ?? "",
        remark: saved?.remark ?? "",
      },
    };
  });

  return (
    <>
      <PageHeader title={strings.academics.title} description={strings.academics.pick} />

      <form method="get" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
        <div>
          <label htmlFor="academics-year" className="text-muted-foreground text-xs">
            {strings.academics.year}
          </label>
          <select id="academics-year" name="year" defaultValue={year} className={SELECT}>
            {years.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="academics-grade" className="text-muted-foreground text-xs">
            {strings.academics.grade}
          </label>
          <select
            id="academics-grade"
            name="grade"
            defaultValue={gradeKey ?? ""}
            className={SELECT}
          >
            <option value="">—</option>
            {options.grades.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="academics-term" className="text-muted-foreground text-xs">
            {strings.academics.term}
          </label>
          <select id="academics-term" name="term" defaultValue={termKey ?? ""} className={SELECT}>
            <option value="">—</option>
            {options.terms.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="academics-subject" className="text-muted-foreground text-xs">
            {strings.academics.subject}
          </label>
          <select
            id="academics-subject"
            name="subject"
            defaultValue={subjectKey ?? ""}
            className={SELECT}
          >
            <option value="">—</option>
            {options.subjects.map((row) => (
              <option key={row.key} value={row.key}>
                {row.label}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit" className="col-span-2 h-11 sm:col-span-1">
          {strings.academics.show}
        </Button>
      </form>

      {!complete ? (
        <EmptyState title={strings.academics.pick} />
      ) : rows.length === 0 ? (
        <EmptyState title={strings.academics.empty} />
      ) : (
        <div className="space-y-3">
          {!canWrite ? (
            <p className="text-muted-foreground text-sm">{strings.academics.readOnly}</p>
          ) : null}
          <BulkEntry
            // A different class is a different list; the key reseeds the form.
            key={`${year}-${gradeKey}-${termKey}-${subjectKey}`}
            academicYear={year}
            gradeKey={gradeKey ?? ""}
            termKey={termKey ?? ""}
            subjectKey={subjectKey ?? ""}
            rows={rows}
            canWrite={canWrite}
          />
        </div>
      )}
    </>
  );
}
