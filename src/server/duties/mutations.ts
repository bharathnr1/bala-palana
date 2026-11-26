import "server-only";

import { and, asc, desc, eq, gte, inArray, lt, lte, ne } from "drizzle-orm";
import { z } from "zod";

import { canSplitAt, cycleDatesProblem, type CyclePeriod } from "@/lib/cycles";
import { addDaysISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate, type Tx } from "@/server/db/mutate";
import { child, cycle, team, teamMember } from "@/server/db/schema";

const uuid = z.uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, strings.children.errors.date);

/** The values the board offers: pause and skip are two of them (D8). */
const CYCLE_STATUSES = ["planned", "active", "paused", "skipped", "done"] as const;

async function loadCycle(tx: Tx, id: string) {
  const [row] = await tx.select().from(cycle).where(eq(cycle.id, id)).limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.duties.errors.notFound);
  return row;
}

/**
 * The database's exclusion constraint is the real guard; this check inside the
 * transaction turns the clash into a sentence the board can show.
 */
async function assertFree(tx: Tx, period: CyclePeriod, exceptId?: string): Promise<void> {
  const [clash] = await tx
    .select({ id: cycle.id })
    .from(cycle)
    .where(
      and(
        exceptId ? ne(cycle.id, exceptId) : undefined,
        lte(cycle.startOn, period.endOn),
        gte(cycle.endOn, period.startOn),
      ),
    )
    .limit(1);

  if (clash) throw new AppError("CONFLICT", strings.duties.errors.overlap);
}

export const saveCycleDatesSchema = z.object({ id: uuid, startOn: isoDate, endOn: isoDate });
export type SaveCycleDatesInput = z.infer<typeof saveCycleDatesSchema>;

/** Edit a cycle's dates (D8); the period may not run into another cycle. */
export async function saveCycleDates(user: SessionUser, input: SaveCycleDatesInput): Promise<void> {
  assertCan(user, "duty.write");
  if (cycleDatesProblem(input.startOn, input.endOn)) {
    throw new AppError("INVALID", strings.duties.errors.datesOrder);
  }

  await mutate(user, async (tx) => {
    await loadCycle(tx, input.id);
    await assertFree(tx, input, input.id);
    await tx
      .update(cycle)
      .set({ startOn: input.startOn, endOn: input.endOn, updatedAt: new Date() })
      .where(eq(cycle.id, input.id));
  });
}

export const splitCycleSchema = z.object({ id: uuid, on: isoDate });
export type SplitCycleInput = z.infer<typeof splitCycleSchema>;

/**
 * Split a cycle at `on`, which becomes the first day of the second cycle.
 * Teams stay with the first half; the coordinator moves them if needed.
 */
export async function splitCycleAt(user: SessionUser, input: SplitCycleInput): Promise<void> {
  assertCan(user, "duty.write");

  await mutate(user, async (tx) => {
    const row = await loadCycle(tx, input.id);
    if (!canSplitAt({ startOn: row.startOn, endOn: row.endOn }, input.on)) {
      throw new AppError("INVALID", strings.duties.errors.splitOutside);
    }

    await tx
      .update(cycle)
      .set({ endOn: addDaysISO(input.on, -1), updatedAt: new Date() })
      .where(eq(cycle.id, row.id));
    await tx.insert(cycle).values({ startOn: input.on, endOn: row.endOn });
  });
}

export const mergeCyclesSchema = z.object({ id: uuid, withId: uuid });
export type MergeCyclesInput = z.infer<typeof mergeCyclesSchema>;

/**
 * Merge two touching cycles into one. The second cycle's teams move to the
 * merged cycle before it is removed, so no membership is lost; the audit
 * trigger records the delete (D12).
 */
export async function mergeCyclePair(user: SessionUser, input: MergeCyclesInput): Promise<void> {
  assertCan(user, "duty.write");
  if (input.id === input.withId) {
    throw new AppError("INVALID", strings.duties.errors.mergeNotAdjacent);
  }

  await mutate(user, async (tx) => {
    const left = await loadCycle(tx, input.id);
    const right = await loadCycle(tx, input.withId);
    const [first, second] = left.startOn <= right.startOn ? [left, right] : [right, left];

    if (addDaysISO(first.endOn, 1) !== second.startOn) {
      throw new AppError("CONFLICT", strings.duties.errors.mergeNotAdjacent);
    }

    await tx
      .update(team)
      .set({ cycleId: first.id, updatedAt: new Date() })
      .where(eq(team.cycleId, second.id));
    await tx.delete(cycle).where(eq(cycle.id, second.id));
    await tx.update(cycle).set({ endOn: second.endOn, updatedAt: new Date() }).where(eq(cycle.id, first.id));
  });
}

export const changeCycleStatusSchema = z.object({ id: uuid, status: z.enum(CYCLE_STATUSES) });
export type ChangeCycleStatusInput = z.infer<typeof changeCycleStatusSchema>;

/** Pause (holidays), skip, reopen or close a cycle — one status change. */
export async function changeCycleStatus(
  user: SessionUser,
  input: ChangeCycleStatusInput,
): Promise<void> {
  assertCan(user, "duty.write");

  await mutate(user, async (tx) => {
    await loadCycle(tx, input.id);
    await tx
      .update(cycle)
      .set({ status: input.status, updatedAt: new Date() })
      .where(eq(cycle.id, input.id));
  });
}

// ------------------------------------------------------------- the board ----

async function loadTeam(tx: Tx, id: string) {
  const [row] = await tx.select().from(team).where(eq(team.id, id)).limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.duties.errors.teamNotFound);
  return row;
}

async function loadMember(tx: Tx, id: string) {
  const [row] = await tx
    .select({
      memberId: teamMember.id,
      teamId: teamMember.teamId,
      childId: teamMember.childId,
    })
    .from(teamMember)
    .where(eq(teamMember.id, id))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.duties.errors.memberNotFound);
  return row;
}

/** The team's cycle, so membership dates can be checked against it. */
async function cycleOfTeam(tx: Tx, teamId: string) {
  const [row] = await tx
    .select({
      id: cycle.id,
      startOn: cycle.startOn,
      endOn: cycle.endOn,
    })
    .from(team)
    .innerJoin(cycle, eq(cycle.id, team.cycleId))
    .where(eq(team.id, teamId))
    .limit(1);
  if (!row) throw new AppError("NOT_FOUND", strings.duties.errors.teamNotFound);
  return row;
}

export const createTeamSchema = z.object({ cycleId: uuid, dutyId: uuid });
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

export async function createTeam(user: SessionUser, input: CreateTeamInput): Promise<{ id: string }> {
  assertCan(user, "duty.write");

  return mutate(user, async (tx) => {
    await loadCycle(tx, input.cycleId);
    const rows = await tx
      .select({ sort: team.sort })
      .from(team)
      .where(eq(team.cycleId, input.cycleId));
    const sort = rows.reduce((max, row) => Math.max(max, row.sort), 0) + 1;
    const [row] = await tx
      .insert(team)
      .values({
        cycleId: input.cycleId,
        dutyId: input.dutyId,
        label: `${strings.duties.team} ${sort}`,
        sort,
      })
      .returning({ id: team.id });
    if (!row) throw new AppError("INVALID", strings.errors.unexpected);
    return { id: row.id };
  });
}

export const addTeamMembersSchema = z.object({
  teamId: uuid,
  childIds: z.preprocess((value) => {
    if (typeof value !== "string") return value;
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }, z.array(uuid).min(1).max(60)),
});
export type AddTeamMembersInput = z.infer<typeof addTeamMembersSchema>;

/**
 * Add children to a team. Only `student`s take duties; a child already in the
 * team is ignored rather than failing the batch (the unique key allows it).
 */
export async function addTeamMembers(
  user: SessionUser,
  input: AddTeamMembersInput,
): Promise<number> {
  assertCan(user, "duty.write");

  return mutate(user, async (tx) => {
    await loadTeam(tx, input.teamId);
    const requested = new Set(input.childIds);
    const students = await tx
      .select({ id: child.id })
      .from(child)
      .where(and(inArray(child.id, [...requested]), eq(child.stage, "student")));
    if (students.length !== requested.size) {
      throw new AppError("INVALID", strings.duties.errors.notStudent);
    }

    const inserted = await tx
      .insert(teamMember)
      .values(students.map((row) => ({ teamId: input.teamId, childId: row.id })))
      .onConflictDoNothing()
      .returning({ id: teamMember.id });

    return inserted.length;
  });
}

export const memberIdSchema = z.object({ id: uuid });
export type MemberIdInput = z.infer<typeof memberIdSchema>;

export async function removeTeamMember(user: SessionUser, input: MemberIdInput): Promise<void> {
  assertCan(user, "duty.write");

  await mutate(user, async (tx) => {
    await loadMember(tx, input.id);
    await tx.delete(teamMember).where(eq(teamMember.id, input.id));
  });
}

export const setMemberRoleSchema = z.object({ id: uuid, role: z.enum(["lead", "member"]) });
export type SetMemberRoleInput = z.infer<typeof setMemberRoleSchema>;

export async function setMemberRole(user: SessionUser, input: SetMemberRoleInput): Promise<void> {
  assertCan(user, "duty.write");

  await mutate(user, async (tx) => {
    await loadMember(tx, input.id);
    await tx
      .update(teamMember)
      .set({ role: input.role, updatedAt: new Date() })
      .where(eq(teamMember.id, input.id));
  });
}

const optionalIsoDate = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, strings.children.errors.date).optional(),
);

export const setMemberDatesSchema = z.object({
  id: uuid,
  fromOn: optionalIsoDate,
  toOn: optionalIsoDate,
});
export type SetMemberDatesInput = z.infer<typeof setMemberDatesSchema>;

/**
 * Mid-cycle swaps use these dates (D9); null means the cycle boundary. Both
 * dates must fall inside the team's cycle, and a start after the end is
 * refused rather than stored.
 */
export async function setMemberDates(
  user: SessionUser,
  input: SetMemberDatesInput,
): Promise<void> {
  assertCan(user, "duty.write");
  if (input.fromOn && input.toOn && input.toOn < input.fromOn) {
    throw new AppError("INVALID", strings.duties.errors.memberDatesOrder);
  }

  await mutate(user, async (tx) => {
    const member = await loadMember(tx, input.id);
    const span = await cycleOfTeam(tx, member.teamId);
    for (const date of [input.fromOn, input.toOn]) {
      if (date && (date < span.startOn || date > span.endOn)) {
        throw new AppError("INVALID", strings.duties.errors.memberDatesOutside);
      }
    }

    await tx
      .update(teamMember)
      .set({ fromOn: input.fromOn ?? null, toOn: input.toOn ?? null, updatedAt: new Date() })
      .where(eq(teamMember.id, input.id));
  });
}

export const moveTeamMemberSchema = z.object({ id: uuid, toTeamId: uuid });
export type MoveTeamMemberInput = z.infer<typeof moveTeamMemberSchema>;

export async function moveTeamMember(user: SessionUser, input: MoveTeamMemberInput): Promise<void> {
  assertCan(user, "duty.write");

  await mutate(user, async (tx) => {
    const member = await loadMember(tx, input.id);
    const from = await cycleOfTeam(tx, member.teamId);
    const to = await cycleOfTeam(tx, input.toTeamId);
    if (from.id !== to.id) {
      throw new AppError("CONFLICT", strings.duties.errors.moveAcrossCycles);
    }

    const [existing] = await tx
      .select({ id: teamMember.id })
      .from(teamMember)
      .where(and(eq(teamMember.teamId, input.toTeamId), eq(teamMember.childId, member.childId)))
      .limit(1);
    if (existing) throw new AppError("CONFLICT", strings.duties.errors.alreadyInTeam);

    await tx
      .update(teamMember)
      .set({ teamId: input.toTeamId, updatedAt: new Date() })
      .where(eq(teamMember.id, input.id));
  });
}

export const copyCycleTeamsSchema = z.object({ cycleId: uuid });
export type CopyCycleTeamsInput = z.infer<typeof copyCycleTeamsSchema>;

/**
 * Copy the previous cycle's teams, members and leads into this one (M3-03).
 * Dates are dropped (null = the whole cycle, D9), and a child who is no longer
 * a student is skipped rather than left off silently. Refuses when the target
 * already has teams, so a second press cannot duplicate them.
 */
export async function copyCycleTeams(
  user: SessionUser,
  input: CopyCycleTeamsInput,
): Promise<{ teams: number; members: number }> {
  assertCan(user, "duty.write");

  return mutate(user, async (tx) => {
    const target = await loadCycle(tx, input.cycleId);
    const existing = await tx
      .select({ id: team.id })
      .from(team)
      .where(eq(team.cycleId, target.id))
      .limit(1);
    if (existing.length > 0) throw new AppError("CONFLICT", strings.duties.errors.cycleNotEmpty);

    const [previous] = await tx
      .select({ id: cycle.id })
      .from(cycle)
      .where(lt(cycle.startOn, target.startOn))
      .orderBy(desc(cycle.startOn))
      .limit(1);
    if (!previous) throw new AppError("NOT_FOUND", strings.duties.errors.noPreviousCycle);

    const sourceTeams = await tx
      .select()
      .from(team)
      .where(eq(team.cycleId, previous.id))
      .orderBy(asc(team.sort));
    if (sourceTeams.length === 0) throw new AppError("NOT_FOUND", strings.duties.errors.noPreviousCycle);

    let members = 0;
    for (const source of sourceTeams) {
      const [copied] = await tx
        .insert(team)
        .values({
          cycleId: target.id,
          dutyId: source.dutyId,
          label: source.label,
          sort: source.sort,
        })
        .returning({ id: team.id });
      if (!copied) continue;

      const roster = await tx
        .select({
          childId: teamMember.childId,
          role: teamMember.role,
        })
        .from(teamMember)
        .innerJoin(child, eq(child.id, teamMember.childId))
        .where(and(eq(teamMember.teamId, source.id), eq(child.stage, "student")));

      if (roster.length === 0) continue;
      const inserted = await tx
        .insert(teamMember)
        .values(roster.map((row) => ({ teamId: copied.id, childId: row.childId, role: row.role })))
        .onConflictDoNothing()
        .returning({ id: teamMember.id });
      members += inserted.length;
    }

    return { teams: sourceTeams.length, members };
  });
}
