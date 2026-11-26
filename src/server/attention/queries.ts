import "server-only";

import { and, asc, count, desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import type { SessionUser } from "@/server/auth/session";
import { assertCan } from "@/server/auth/permissions";
import { currentAcademicYear } from "@/server/children/queries";
import { getDb } from "@/server/db/client";
import { appUser, child, enrolment, lookup } from "@/server/db/schema";
import { vNeedsAttention } from "@/server/db/schema/views";

export const ATTENTION_REASONS = [
  "overdue_follow_ups",
  "open_concerns",
  "concern_subjects",
  "stale",
] as const;
export type AttentionReason = (typeof ATTENTION_REASONS)[number];

export type AttentionRow = {
  childId: string;
  childName: string;
  gradeId: string | null;
  gradeLabel: string | null;
  reasons: AttentionReason[];
  openConcerns: number;
  overdueFollowUps: number;
  concernSubjects: number;
  daysSinceLastEntry: number;
  lastAuthorName: string | null;
};

export type AttentionFilters = {
  gradeId?: string;
  authorId?: string;
};

export type AttentionOption = { id: string; label: string };

const grade = alias(lookup, "grade");
const lastAuthor = alias(appUser, "last_author");

/** The view's reasons are text; keep only the keys the UI knows (D2). */
function toReasons(raw: string[]): AttentionReason[] {
  const known = new Set<string>(ATTENTION_REASONS);
  return raw.filter((reason): reason is AttentionReason => known.has(reason));
}

/**
 * The children who need attention, worst first (M2-06). Every role with
 * `report.attention` reads the same staff-visible view, so nothing restricted
 * reaches a teacher (D13).
 */
export async function listNeedsAttention(
  user: SessionUser,
  filters: AttentionFilters = {},
): Promise<AttentionRow[]> {
  assertCan(user, "report.attention");
  const academicYear = await currentAcademicYear();

  const conditions = [eq(enrolment.academicYear, academicYear)];
  if (filters.gradeId) conditions.push(eq(enrolment.gradeId, filters.gradeId));
  if (filters.authorId) conditions.push(eq(vNeedsAttention.lastAuthorId, filters.authorId));

  const rows = await getDb()
    .select({
      childId: vNeedsAttention.childId,
      childName: child.fullName,
      gradeId: enrolment.gradeId,
      gradeLabel: grade.label,
      reasons: vNeedsAttention.reasons,
      openConcerns: vNeedsAttention.openConcerns,
      overdueFollowUps: vNeedsAttention.overdueFollowUps,
      concernSubjects: vNeedsAttention.concernSubjects,
      daysSinceLastEntry: vNeedsAttention.daysSinceLastEntry,
      lastAuthorName: lastAuthor.name,
    })
    .from(vNeedsAttention)
    .innerJoin(child, eq(child.id, vNeedsAttention.childId))
    .leftJoin(enrolment, and(eq(enrolment.childId, child.id), eq(enrolment.academicYear, academicYear)))
    .leftJoin(grade, eq(enrolment.gradeId, grade.id))
    .leftJoin(lastAuthor, eq(vNeedsAttention.lastAuthorId, lastAuthor.id))
    .where(and(...conditions))
    // Severity: an overdue follow-up outranks an open concern, then neglect.
    .orderBy(
      desc(vNeedsAttention.overdueFollowUps),
      desc(vNeedsAttention.openConcerns),
      desc(vNeedsAttention.daysSinceLastEntry),
      asc(child.fullName),
    );

  return rows.map((row) => ({ ...row, reasons: toReasons(row.reasons) }));
}

/** The Home count card (M2-06). */
export async function attentionCount(user: SessionUser): Promise<number> {
  assertCan(user, "report.attention");

  const [row] = await getDb().select({ value: count() }).from(vNeedsAttention);
  return Number(row?.value ?? 0);
}

/**
 * The two filters on `/attention`: grades from the lookup and the staff who
 * last recorded an entry for a flagged child.
 */
export async function attentionFilterOptions(user: SessionUser): Promise<{
  grades: AttentionOption[];
  authors: AttentionOption[];
}> {
  assertCan(user, "report.attention");

  const gradeRows = await getDb()
    .select({ id: lookup.id, label: lookup.label })
    .from(lookup)
    .where(and(eq(lookup.kind, "grade"), eq(lookup.active, true)))
    .orderBy(asc(lookup.sort), asc(lookup.label));

  const authorRows = await getDb()
    .select({ id: appUser.id, label: appUser.name })
    .from(appUser)
    .where(eq(appUser.active, true))
    .orderBy(asc(appUser.name));

  return { grades: gradeRows, authors: authorRows };
}
