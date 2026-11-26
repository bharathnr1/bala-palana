import "server-only";

import { and, eq, gte, lte, ne } from "drizzle-orm";
import { z } from "zod";

import { canSplitAt, cycleDatesProblem, type CyclePeriod } from "@/lib/cycles";
import { addDaysISO } from "@/lib/dates";
import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate, type Tx } from "@/server/db/mutate";
import { cycle, team } from "@/server/db/schema";

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
