import "server-only";

import { and, gte, lte } from "drizzle-orm";

import { cyclePeriods, periodsOverlap, type CycleRule } from "@/lib/cycles";
import { assertCan } from "@/server/auth/permissions";
import type { SessionUser } from "@/server/auth/session";
import { mutate } from "@/server/db/mutate";
import { cycle } from "@/server/db/schema";

/**
 * Fills the duty calendar for `[fromISO, toISO]` (M3-01). Idempotent: a period
 * is skipped when any existing cycle overlaps it, so an admin's edited, split
 * or merged cycle is never recreated and the overlap constraint is never hit.
 *
 * The duty board calls this on load, which is why the app needs no scheduled
 * job; a teacher's read-only visit does not trigger it.
 */
export async function ensureCycles(
  user: SessionUser,
  rule: CycleRule,
  fromISO: string,
  toISO: string,
): Promise<number> {
  assertCan(user, "duty.write");
  const periods = cyclePeriods(rule, fromISO, toISO);
  if (periods.length === 0) return 0;

  return mutate(user, async (tx) => {
    const existing = await tx
      .select({ startOn: cycle.startOn, endOn: cycle.endOn })
      .from(cycle)
      .where(and(lte(cycle.startOn, toISO), gte(cycle.endOn, fromISO)));

    const missing = periods.filter(
      (period) => !existing.some((row) => periodsOverlap(period, row)),
    );
    if (missing.length === 0) return 0;

    await tx.insert(cycle).values(missing);
    return missing.length;
  });
}
