import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { assessment, child, enrolment, lookup } from "@/server/db/schema";

const grade = alias(lookup, "grade");
const term = alias(lookup, "term");
const subject = alias(lookup, "subject");

export type AssessmentRow = {
  id: string;
  childId: string;
  academicYear: string;
  gradeKey: string | null;
  gradeLabel: string | null;
  termKey: string;
  termLabel: string;
  subjectKey: string;
  subjectLabel: string;
  marks: number | null;
  maxMarks: number | null;
  gradeLetter: string | null;
  remark: string | null;
  recordedById: string | null;
  updatedAt: Date;
};

export type ClassAssessmentRow = AssessmentRow & { childName: string };

const assessmentColumns = {
  id: assessment.id,
  childId: assessment.childId,
  academicYear: assessment.academicYear,
  gradeKey: grade.key,
  gradeLabel: grade.label,
  termKey: term.key,
  termLabel: term.label,
  subjectKey: subject.key,
  subjectLabel: subject.label,
  marks: assessment.marks,
  maxMarks: assessment.maxMarks,
  gradeLetter: assessment.gradeLetter,
  remark: assessment.remark,
  recordedById: assessment.recordedBy,
  updatedAt: assessment.updatedAt,
};

type RawRow = {
  id: string;
  childId: string;
  academicYear: string;
  gradeKey: string | null;
  gradeLabel: string | null;
  termKey: string | null;
  termLabel: string | null;
  subjectKey: string | null;
  subjectLabel: string | null;
  marks: string | null;
  maxMarks: string | null;
  gradeLetter: string | null;
  remark: string | null;
  recordedById: string | null;
  updatedAt: Date;
};

/** numeric(6,2) comes back as a string; the UI wants a number. */
function toNumber(value: string | null): number | null {
  return value === null ? null : Number(value);
}

function toRow(row: RawRow): AssessmentRow {
  return {
    id: row.id,
    childId: row.childId,
    academicYear: row.academicYear,
    gradeKey: row.gradeKey,
    gradeLabel: row.gradeLabel,
    termKey: row.termKey ?? "",
    termLabel: row.termLabel ?? "",
    subjectKey: row.subjectKey ?? "",
    subjectLabel: row.subjectLabel ?? "",
    marks: toNumber(row.marks),
    maxMarks: toNumber(row.maxMarks),
    gradeLetter: row.gradeLetter,
    remark: row.remark,
    recordedById: row.recordedById,
    updatedAt: row.updatedAt,
  };
}

/** One child's assessments, newest year first, then term and subject order. */
export async function listChildAssessments(
  user: SessionUser,
  childId: string,
  academicYear?: string,
): Promise<AssessmentRow[]> {
  assertCan(user, "assessment.read");

  const conditions = [eq(assessment.childId, childId)];
  if (academicYear) conditions.push(eq(assessment.academicYear, academicYear));

  const rows = await getDb()
    .select(assessmentColumns)
    .from(assessment)
    .innerJoin(term, eq(assessment.termId, term.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .leftJoin(grade, eq(assessment.gradeId, grade.id))
    .where(and(...conditions))
    .orderBy(desc(assessment.academicYear), asc(term.sort), asc(subject.sort));

  return rows.map(toRow);
}

async function lookupId(kind: string, key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key), eq(lookup.active, true)))
    .limit(1);
  if (!row) throw new AppError("INVALID", strings.academics.errors.unknownClass);
  return row.id;
}

/**
 * The recorded marks of one class and term (M4-02 bulk entry, M4-04 summary).
 * Every row carries the child's name; a child with no mark simply has no row.
 */
export async function listClassAssessments(
  user: SessionUser,
  filter: {
    academicYear: string;
    gradeKey: string;
    termKey: string;
    subjectKey?: string;
  },
): Promise<ClassAssessmentRow[]> {
  assertCan(user, "assessment.read");

  const conditions = [
    eq(assessment.academicYear, filter.academicYear),
    eq(assessment.gradeId, await lookupId("grade", filter.gradeKey)),
    eq(assessment.termId, await lookupId("term", filter.termKey)),
  ];
  if (filter.subjectKey) {
    conditions.push(eq(assessment.subjectId, await lookupId("subject", filter.subjectKey)));
  }

  const rows = await getDb()
    .select({ ...assessmentColumns, childName: child.fullName })
    .from(assessment)
    .innerJoin(term, eq(assessment.termId, term.id))
    .innerJoin(subject, eq(assessment.subjectId, subject.id))
    .innerJoin(child, eq(assessment.childId, child.id))
    .leftJoin(grade, eq(assessment.gradeId, grade.id))
    .where(and(...conditions))
    .orderBy(asc(child.fullName), asc(subject.sort));

  return rows.map((row) => ({ ...toRow(row), childName: row.childName }));
}

export type ClassChild = { id: string; fullName: string };

/**
 * The children enrolled in one grade for one academic year (M4-02). A class is
 * inherently small, so this list is not paginated; the enrolment join bounds it.
 */
export async function listClassChildren(
  user: SessionUser,
  filter: { academicYear: string; gradeKey: string },
): Promise<ClassChild[]> {
  assertCan(user, "assessment.read");
  const gradeId = await lookupId("grade", filter.gradeKey);

  return getDb()
    .select({ id: child.id, fullName: child.fullName })
    .from(enrolment)
    .innerJoin(child, eq(child.id, enrolment.childId))
    .where(
      and(
        eq(enrolment.academicYear, filter.academicYear),
        eq(enrolment.gradeId, gradeId),
      ),
    )
    .orderBy(asc(child.fullName), asc(child.id));
}

export type AssessmentOptions = {
  grades: { key: string; label: string }[];
  terms: { key: string; label: string }[];
  subjects: { key: string; label: string }[];
};

/** Active grades, terms and subjects for the pickers (D7: ids never cross). */
export async function assessmentOptions(user: SessionUser): Promise<AssessmentOptions> {
  assertCan(user, "assessment.read");

  const rows = await getDb()
    .select({ kind: lookup.kind, key: lookup.key, label: lookup.label })
    .from(lookup)
    .where(
      and(
        eq(lookup.active, true),
        inArray(lookup.kind, ["grade", "term", "subject"]),
      ),
    )
    .orderBy(asc(lookup.kind), asc(lookup.sort));

  return {
    grades: rows.filter((row) => row.kind === "grade").map(({ key, label }) => ({ key, label })),
    terms: rows.filter((row) => row.kind === "term").map(({ key, label }) => ({ key, label })),
    subjects: rows
      .filter((row) => row.kind === "subject")
      .map(({ key, label }) => ({ key, label })),
  };
}
