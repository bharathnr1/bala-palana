import "server-only";

import { and, asc, eq, ilike, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { z } from "zod";

import { academicYearOf } from "@/lib/academic-year";
import type { ChildStage } from "@/lib/children";
import type { Role } from "@/lib/permissions";
import { todayISO } from "@/lib/dates";
import { assertCan } from "@/server/auth/permissions";
import { getDb } from "@/server/db/client";
import { child, childGuardian, enrolment, guardian, lookup, setting } from "@/server/db/schema";

/** Lists are paginated past 50 rows (AGENTS.md § Coding rules). */
export const CHILDREN_PAGE_SIZE = 50;

export type ChildListFilters = {
  search?: string;
  stage?: ChildStage;
  gradeKey?: string;
  groupKey?: string;
  page?: number;
};

export type ChildListItem = {
  id: string;
  fullName: string;
  preferredName: string | null;
  stage: ChildStage;
  gradeLabel: string | null;
  groupLabel: string | null;
};

export type ChildProfile = {
  id: string;
  fullName: string;
  preferredName: string | null;
  dob: string | null;
  stage: ChildStage;
  joinedOn: string | null;
  leftOn: string | null;
  leftReason: string | null;
  notes: string | null;
  consentGivenAt: Date | null;
  enrolment: {
    academicYear: string;
    gradeKey: string | null;
    gradeLabel: string | null;
    groupKey: string | null;
    groupLabel: string | null;
    outsideSchool: string | null;
  } | null;
  primaryGuardian: {
    id: string;
    name: string;
    phone: string | null;
    relationKey: string | null;
    relationLabel: string | null;
  } | null;
};

export type LookupOption = { id: string; key: string; label: string };

/** The academic year the list shows grades for: the setting decides the start month (D15). */
export async function currentAcademicYear(): Promise<string> {
  const [row] = await getDb()
    .select({ value: setting.value })
    .from(setting)
    .where(eq(setting.key, "academic_year_start_month"))
    .limit(1);

  const startMonth =
    typeof row?.value === "number" && row.value >= 1 && row.value <= 12 ? row.value : 6;
  return academicYearOf(todayISO(), startMonth);
}

/** Active options for the filters and the form (D7: code refers to `key`). */
export async function childLookups(): Promise<{
  grades: LookupOption[];
  groups: LookupOption[];
  relations: LookupOption[];
}> {
  const rows = await getDb()
    .select({ id: lookup.id, kind: lookup.kind, key: lookup.key, label: lookup.label })
    .from(lookup)
    .where(eq(lookup.active, true))
    .orderBy(asc(lookup.sort), asc(lookup.label));

  const ofKind = (kind: string) =>
    rows.filter((row) => row.kind === kind).map(({ id, key, label }) => ({ id, key, label }));

  return { grades: ofKind("grade"), groups: ofKind("group"), relations: ofKind("relation") };
}

function normalisePage(page: number | undefined): number {
  return page && Number.isInteger(page) && page > 0 ? page : 1;
}

/**
 * The children list: trigram-backed name search, grade/group from the current
 * enrolment, optional stage filter. One extra row tells us whether a next page
 * exists without a count query.
 */
export async function listChildren(
  user: { role: Role },
  filters: ChildListFilters,
): Promise<{ rows: ChildListItem[]; hasNext: boolean; page: number }> {
  assertCan(user, "child.read");

  const page = normalisePage(filters.page);
  const academicYear = await currentAcademicYear();
  const grade = alias(lookup, "grade");
  const group = alias(lookup, "group");
  const term = filters.search?.trim();

  const rows = await getDb()
    .select({
      id: child.id,
      fullName: child.fullName,
      preferredName: child.preferredName,
      stage: child.stage,
      gradeLabel: grade.label,
      groupLabel: group.label,
    })
    .from(child)
    .leftJoin(
      enrolment,
      and(eq(enrolment.childId, child.id), eq(enrolment.academicYear, academicYear)),
    )
    .leftJoin(grade, eq(grade.id, enrolment.gradeId))
    .leftJoin(group, eq(group.id, enrolment.groupId))
    .where(
      and(
        filters.stage ? eq(child.stage, filters.stage) : undefined,
        term ? ilike(child.fullName, `%${term}%`) : undefined,
        filters.gradeKey ? eq(grade.key, filters.gradeKey) : undefined,
        filters.groupKey ? eq(group.key, filters.groupKey) : undefined,
      ),
    )
    .orderBy(asc(child.fullName), asc(child.id))
    .limit(CHILDREN_PAGE_SIZE + 1)
    .offset((page - 1) * CHILDREN_PAGE_SIZE);

  const hasNext = rows.length > CHILDREN_PAGE_SIZE;
  return { rows: hasNext ? rows.slice(0, CHILDREN_PAGE_SIZE) : rows, hasNext, page };
}

export type PickerChild = {
  id: string;
  fullName: string;
  gradeLabel: string | null;
  groupLabel: string | null;
};

/**
 * The names the child picker offers (04-ui-spec § Shared components). It is a
 * bounded list — students and applicants — searched in the browser so a tap is
 * instant; the list screens keep their 50-row pagination.
 */
export async function listChildrenForPicker(user: { role: Role }): Promise<PickerChild[]> {
  assertCan(user, "child.read");

  const academicYear = await currentAcademicYear();
  const grade = alias(lookup, "grade");
  const group = alias(lookup, "group");

  return getDb()
    .select({
      id: child.id,
      fullName: child.fullName,
      gradeLabel: grade.label,
      groupLabel: group.label,
    })
    .from(child)
    .leftJoin(
      enrolment,
      and(eq(enrolment.childId, child.id), eq(enrolment.academicYear, academicYear)),
    )
    .leftJoin(grade, eq(grade.id, enrolment.gradeId))
    .leftJoin(group, eq(group.id, enrolment.groupId))
    .where(inArray(child.stage, ["student", "applicant"]))
    .orderBy(asc(child.fullName), asc(child.id))
    .limit(500);
}

/** One child with her current enrolment and primary guardian. */
export async function getChild(user: { role: Role }, id: string): Promise<ChildProfile | undefined> {
  assertCan(user, "child.read");

  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return undefined;

  const academicYear = await currentAcademicYear();
  const grade = alias(lookup, "grade");
  const group = alias(lookup, "group");
  const relation = alias(lookup, "relation");

  const [row] = await getDb()
    .select({
      id: child.id,
      fullName: child.fullName,
      preferredName: child.preferredName,
      dob: child.dob,
      stage: child.stage,
      joinedOn: child.joinedOn,
      leftOn: child.leftOn,
      leftReason: child.leftReason,
      notes: child.notes,
      consentGivenAt: child.consentGivenAt,
      academicYear: enrolment.academicYear,
      gradeKey: grade.key,
      gradeLabel: grade.label,
      groupKey: group.key,
      groupLabel: group.label,
      outsideSchool: enrolment.outsideSchool,
      guardianId: guardian.id,
      guardianName: guardian.name,
      guardianPhone: guardian.phone,
      relationKey: relation.key,
      relationLabel: relation.label,
    })
    .from(child)
    .leftJoin(
      enrolment,
      and(eq(enrolment.childId, child.id), eq(enrolment.academicYear, academicYear)),
    )
    .leftJoin(grade, eq(grade.id, enrolment.gradeId))
    .leftJoin(group, eq(group.id, enrolment.groupId))
    .leftJoin(
      childGuardian,
      and(eq(childGuardian.childId, child.id), eq(childGuardian.isPrimary, true)),
    )
    .leftJoin(guardian, eq(guardian.id, childGuardian.guardianId))
    .leftJoin(relation, eq(relation.id, childGuardian.relationId))
    .where(eq(child.id, parsed.data))
    .limit(1);

  if (!row) return undefined;

  return {
    id: row.id,
    fullName: row.fullName,
    preferredName: row.preferredName,
    dob: row.dob,
    stage: row.stage,
    joinedOn: row.joinedOn,
    leftOn: row.leftOn,
    leftReason: row.leftReason,
    notes: row.notes,
    consentGivenAt: row.consentGivenAt,
    enrolment: row.academicYear
      ? {
          academicYear: row.academicYear,
          gradeKey: row.gradeKey,
          gradeLabel: row.gradeLabel,
          groupKey: row.groupKey,
          groupLabel: row.groupLabel,
          outsideSchool: row.outsideSchool,
        }
      : null,
    primaryGuardian: row.guardianId
      ? {
          id: row.guardianId,
          name: row.guardianName ?? "",
          phone: row.guardianPhone,
          relationKey: row.relationKey,
          relationLabel: row.relationLabel,
        }
      : null,
  };
}
