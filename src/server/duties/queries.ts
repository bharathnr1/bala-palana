import "server-only";

import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { currentAcademicYear } from "@/server/children/queries";
import { getDb } from "@/server/db/client";
import { child, cycle, enrolment, lookup, team, teamMember } from "@/server/db/schema";

export type CycleStatus = (typeof cycle.$inferSelect)["status"];

export type BoardCycle = {
  id: string;
  startOn: string;
  endOn: string;
  status: CycleStatus;
  note: string | null;
};

export type BoardMember = {
  memberId: string;
  childId: string;
  childName: string;
  gradeLabel: string | null;
  role: "lead" | "member";
  fromOn: string | null;
  toOn: string | null;
};

export type BoardTeam = {
  id: string;
  dutyId: string | null;
  dutyLabel: string;
  label: string;
  sort: number;
  members: BoardMember[];
};

export type DutyChoice = { id: string; label: string };

/** Every cycle, oldest first: the switcher walks the list (M3-03). */
export async function listCycles(user: SessionUser): Promise<BoardCycle[]> {
  assertCan(user, "duty.read");

  return getDb()
    .select({
      id: cycle.id,
      startOn: cycle.startOn,
      endOn: cycle.endOn,
      status: cycle.status,
      note: cycle.note,
    })
    .from(cycle)
    .orderBy(asc(cycle.startOn));
}

/** The duties the board shows as cards, in the order Settings lists them. */
export async function dutyChoices(user: SessionUser): Promise<DutyChoice[]> {
  assertCan(user, "duty.read");

  return getDb()
    .select({ id: lookup.id, label: lookup.label })
    .from(lookup)
    .where(and(eq(lookup.kind, "duty"), eq(lookup.active, true)))
    .orderBy(asc(lookup.sort), asc(lookup.label));
}

/**
 * One cycle's teams and members (M3-03), grouped by duty in the page. Teams
 * with no duty (possible in the schema) land under "Unassigned".
 */
export async function dutyBoard(user: SessionUser, cycleId: string): Promise<BoardTeam[]> {
  assertCan(user, "duty.read");
  const academicYear = await currentAcademicYear();
  const grade = alias(lookup, "grade");

  const teams = await getDb()
    .select({
      id: team.id,
      dutyId: team.dutyId,
      dutyLabel: lookup.label,
      label: team.label,
      sort: team.sort,
    })
    .from(team)
    .leftJoin(lookup, eq(lookup.id, team.dutyId))
    .where(eq(team.cycleId, cycleId))
    .orderBy(asc(team.sort), asc(team.createdAt));

  if (teams.length === 0) return [];

  const members = await getDb()
    .select({
      memberId: teamMember.id,
      teamId: teamMember.teamId,
      childId: teamMember.childId,
      childName: child.fullName,
      gradeLabel: grade.label,
      role: teamMember.role,
      fromOn: teamMember.fromOn,
      toOn: teamMember.toOn,
    })
    .from(teamMember)
    .innerJoin(child, eq(child.id, teamMember.childId))
    .leftJoin(
      enrolment,
      and(eq(enrolment.childId, child.id), eq(enrolment.academicYear, academicYear)),
    )
    .leftJoin(grade, eq(grade.id, enrolment.gradeId))
    .where(
      inArray(
        teamMember.teamId,
        teams.map((row) => row.id),
      ),
    )
    .orderBy(asc(teamMember.role), asc(child.fullName));

  const byTeam = new Map<string, BoardMember[]>();
  for (const row of members) {
    const list = byTeam.get(row.teamId) ?? [];
    list.push({
      memberId: row.memberId,
      childId: row.childId,
      childName: row.childName,
      gradeLabel: row.gradeLabel,
      role: row.role,
      fromOn: row.fromOn,
      toOn: row.toOn,
    });
    byTeam.set(row.teamId, list);
  }

  return teams.map((row) => ({
    id: row.id,
    dutyId: row.dutyId,
    dutyLabel: row.dutyLabel ?? "",
    label: row.label ?? "Team",
    sort: row.sort,
    members: byTeam.get(row.id) ?? [],
  }));
}

export type OnDutyMember = {
  childId: string;
  childName: string;
  gradeLabel: string | null;
  role: "lead" | "member";
};

/**
 * Who held `dutyId` on `on` (M3-04): `fn_on_duty` joined to the child's name
 * and this year's grade, leads first. One query, so the answer is a tap away.
 */
export async function onDutyRoster(
  user: SessionUser,
  dutyId: string,
  on: string,
): Promise<OnDutyMember[]> {
  assertCan(user, "duty.read");
  const academicYear = await currentAcademicYear();

  const rows = await getDb().execute<{
    child_id: string;
    child_name: string;
    grade_label: string | null;
    role: string;
  }>(sql`
    select r.child_id, c.full_name as child_name, g.label as grade_label, r.role::text as role
    from fn_on_duty(${dutyId}, ${on}) r
    join child c on c.id = r.child_id
    left join enrolment e on e.child_id = c.id and e.academic_year = ${academicYear}
    left join lookup g on g.id = e.grade_id
    order by r.role, c.full_name
  `);

  return rows.map((row) => ({
    childId: row.child_id,
    childName: row.child_name,
    gradeLabel: row.grade_label,
    role: row.role === "lead" ? "lead" : "member",
  }));
}

/** The cycle id to show when the URL names none: the one containing today. */
export function cycleForDate(cycles: readonly BoardCycle[], todayIso: string): BoardCycle | undefined {
  return (
    cycles.find((row) => row.startOn <= todayIso && row.endOn >= todayIso) ??
    cycles.find((row) => row.startOn > todayIso) ??
    cycles[cycles.length - 1]
  );
}
