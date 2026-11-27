import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { lookup } from "@/server/db/schema";
import { vGradeSubjectSummary } from "@/server/db/schema/views";

export type GradeSummaryFilters = {
  academicYear: string;
  /** Lookup labels, which is what the view stores. */
  grade?: string;
  term?: string;
};

export type GradeSummaryRow = {
  academicYear: string;
  grade: string;
  term: string;
  subject: string;
  avgPct: number;
  n: number;
};

/**
 * The grade summary (M4-04): one row per year, grade, term and subject, from
 * `v_grade_subject_summary`. Only roles with `report.read` may ask.
 */
export async function gradeSubjectSummary(
  user: SessionUser,
  filters: GradeSummaryFilters,
): Promise<GradeSummaryRow[]> {
  assertCan(user, "report.read");

  const conditions = [eq(vGradeSubjectSummary.academicYear, filters.academicYear)];
  if (filters.grade) conditions.push(eq(vGradeSubjectSummary.grade, filters.grade));
  if (filters.term) conditions.push(eq(vGradeSubjectSummary.term, filters.term));

  // The view stores labels; the lookups put "Grade 2" before "Grade 10".
  const gradeSort = alias(lookup, "grade_sort");
  const termSort = alias(lookup, "term_sort");
  const subjectSort = alias(lookup, "subject_sort");

  const rows = await getDb()
    .select({
      academicYear: vGradeSubjectSummary.academicYear,
      grade: vGradeSubjectSummary.grade,
      term: vGradeSubjectSummary.term,
      subject: vGradeSubjectSummary.subject,
      avgPct: vGradeSubjectSummary.avgPct,
      n: vGradeSubjectSummary.n,
    })
    .from(vGradeSubjectSummary)
    .leftJoin(
      gradeSort,
      and(eq(gradeSort.kind, "grade"), eq(gradeSort.label, vGradeSubjectSummary.grade)),
    )
    .leftJoin(
      termSort,
      and(eq(termSort.kind, "term"), eq(termSort.label, vGradeSubjectSummary.term)),
    )
    .leftJoin(
      subjectSort,
      and(eq(subjectSort.kind, "subject"), eq(subjectSort.label, vGradeSubjectSummary.subject)),
    )
    .where(and(...conditions))
    .orderBy(
      asc(gradeSort.sort),
      asc(vGradeSubjectSummary.grade),
      asc(termSort.sort),
      asc(subjectSort.sort),
      asc(vGradeSubjectSummary.subject),
    );

  return rows.map((row) => ({ ...row, avgPct: Number(row.avgPct) }));
}

export type ReportLookups = { grades: string[]; terms: string[] };

/** The filter options, as the labels the view and the report show. */
export async function reportLookups(user: SessionUser): Promise<ReportLookups> {
  assertCan(user, "report.read");

  const rows = await getDb()
    .select({ kind: lookup.kind, label: lookup.label })
    .from(lookup)
    .where(and(eq(lookup.active, true), inArray(lookup.kind, ["grade", "term"])))
    .orderBy(asc(lookup.kind), asc(lookup.sort));

  return {
    grades: rows.filter((row) => row.kind === "grade").map((row) => row.label),
    terms: rows.filter((row) => row.kind === "term").map((row) => row.label),
  };
}
