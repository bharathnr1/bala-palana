import "server-only";

import { and, asc, desc, eq, isNull } from "drizzle-orm";

import { todayISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { assertCan, can } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { currentAcademicYear } from "@/server/children/queries";
import { getDb } from "@/server/db/client";
import { cycle, entry, lookup, team, teamMember } from "@/server/db/schema";
import { vDutyCounts } from "@/server/db/schema/views";
import { parseEntryDetails } from "@/server/entries/categories";

export type ResponsibilityRole = {
  entryId: string;
  title: string;
  fromOn: string | null;
  toOn: string | null;
  isCurrent: boolean;
};

export type DutyHistoryRow = {
  memberId: string;
  cycleStartOn: string;
  cycleEndOn: string;
  dutyLabel: string;
  teamLabel: string;
  role: "lead" | "member";
  fromOn: string | null;
  toOn: string | null;
};

export type DutyCount = { dutyId: string; dutyLabel: string; cyclesServed: number };

/** The responsibility entry's details, when the stored shape is still valid. */
function roleDetails(details: Record<string, unknown>): { title: string; from: string | null; to: string | null } | null {
  const parsed = parseEntryDetails("responsibility", details);
  if (!parsed.ok) return null;
  const title = parsed.details.title;
  if (typeof title !== "string") return null;
  return {
    title,
    from: typeof parsed.details.from === "string" ? parsed.details.from : null,
    to: typeof parsed.details.to === "string" ? parsed.details.to : null,
  };
}

/**
 * The roles a child holds or held (M3-05), from responsibility entries: a role
 * with no end date, or one that has not passed, is current. Restricted rows
 * stay filtered for a reader without `restricted.read`, like every entry query.
 */
export async function childResponsibilities(
  user: SessionUser,
  childId: string,
): Promise<ResponsibilityRole[]> {
  assertCan(user, "child.read");
  const today = todayISO();

  const conditions = [
    eq(entry.childId, childId),
    eq(lookup.kind, "entry_category"),
    eq(lookup.key, "responsibility"),
    isNull(entry.deletedAt),
  ];
  if (!can(user, "restricted.read")) conditions.push(eq(entry.visibility, "staff"));

  const rows = await getDb()
    .select({
      id: entry.id,
      details: entry.details,
      occurredAt: entry.occurredAt,
    })
    .from(entry)
    .innerJoin(lookup, eq(lookup.id, entry.categoryId))
    .where(and(...conditions))
    .orderBy(desc(entry.occurredAt));

  return rows
    .map((row) => {
      const details = roleDetails(row.details);
      if (!details) return null;
      const isCurrent = details.to === null || details.to >= today;
      return {
        entryId: row.id,
        title: details.title,
        fromOn: details.from,
        toOn: details.to,
        isCurrent,
      };
    })
    .filter((row): row is ResponsibilityRole => row !== null)
    .sort((a, b) => {
      if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
      return (b.fromOn ?? "").localeCompare(a.fromOn ?? "");
    });
}

/**
 * The cycles a child served, newest first (M3-05). Bounded so a child with
 * years of history still renders quickly; the count view carries the totals.
 */
export async function childDutyHistory(
  user: SessionUser,
  childId: string,
): Promise<DutyHistoryRow[]> {
  assertCan(user, "duty.read");

  const rows = await getDb()
    .select({
      memberId: teamMember.id,
      cycleStartOn: cycle.startOn,
      cycleEndOn: cycle.endOn,
      dutyLabel: lookup.label,
      teamLabel: team.label,
      role: teamMember.role,
      fromOn: teamMember.fromOn,
      toOn: teamMember.toOn,
    })
    .from(teamMember)
    .innerJoin(team, eq(team.id, teamMember.teamId))
    .innerJoin(cycle, eq(cycle.id, team.cycleId))
    .leftJoin(lookup, eq(lookup.id, team.dutyId))
    .where(eq(teamMember.childId, childId))
    .orderBy(desc(cycle.startOn), asc(lookup.label))
    .limit(100);

  return rows.map((row) => ({
    memberId: row.memberId,
    cycleStartOn: row.cycleStartOn,
    cycleEndOn: row.cycleEndOn,
    dutyLabel: row.dutyLabel ?? strings.duties.unassigned,
    teamLabel: row.teamLabel ?? strings.duties.team,
    role: row.role,
    fromOn: row.fromOn,
    toOn: row.toOn,
  }));
}

/** Cycles served per duty for one academic year, busiest first (M3-05). */
export async function childDutyCounts(
  user: SessionUser,
  childId: string,
  academicYear?: string,
): Promise<DutyCount[]> {
  assertCan(user, "duty.read");
  const year = academicYear ?? (await currentAcademicYear());

  const rows = await getDb()
    .select({
      dutyId: vDutyCounts.dutyId,
      dutyLabel: lookup.label,
      cyclesServed: vDutyCounts.cyclesServed,
    })
    .from(vDutyCounts)
    .leftJoin(lookup, eq(lookup.id, vDutyCounts.dutyId))
    .where(and(eq(vDutyCounts.childId, childId), eq(vDutyCounts.academicYear, year)))
    .orderBy(desc(vDutyCounts.cyclesServed), asc(lookup.label));

  return rows.map((row) => ({
    dutyId: row.dutyId,
    dutyLabel: row.dutyLabel ?? strings.duties.unassigned,
    cyclesServed: row.cyclesServed,
  }));
}
