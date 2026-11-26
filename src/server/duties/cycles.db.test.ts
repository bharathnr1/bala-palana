import { asc, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { ensureWindow } from "@/lib/cycles";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, cycle, team } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { ensureCycles } from "./cycles";
import { changeCycleStatus, mergeCyclePair, saveCycleDates, splitCycleAt } from "./mutations";

beforeEach(async () => {
  await resetDatabase();
});

let userCount = 0;

async function makeUser(role: SessionUser["role"]): Promise<SessionUser> {
  userCount += 1;
  const email = `${role}-${userCount}@example.com`;
  const [row] = await getDb()
    .insert(appUser)
    .values({ email, name: `TEST ${role} ${userCount}`, role })
    .returning({ id: appUser.id });
  if (!row) throw new Error("insert failed");
  return { id: row.id, name: `TEST ${role} ${userCount}`, email, role };
}

async function cyclesInOrder() {
  return getDb().select().from(cycle).orderBy(asc(cycle.startOn));
}

describe("ensureCycles", () => {
  it("fills the board's window once and repeats without adding rows", async () => {
    const admin = await makeUser("admin");
    const window = ensureWindow("2026-11-26");

    expect(await ensureCycles(admin, "half_month", window.startOn, window.endOn)).toBe(6);
    expect(await ensureCycles(admin, "half_month", window.startOn, window.endOn)).toBe(0);

    const rows = await cyclesInOrder();
    expect(rows.map((row) => `${row.startOn}..${row.endOn}`)).toEqual([
      "2026-11-01..2026-11-15",
      "2026-11-16..2026-11-30",
      "2026-12-01..2026-12-15",
      "2026-12-16..2026-12-31",
      "2027-01-01..2027-01-15",
      "2027-01-16..2027-01-31",
    ]);
    expect(rows.every((row) => row.status === "planned")).toBe(true);
  });

  it("leaves a cycle the admin edited alone", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");

    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");
    await saveCycleDates(admin, { id: first.id, startOn: "2027-03-02", endOn: "2027-03-12" });

    expect(await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31")).toBe(0);
    expect((await cyclesInOrder()).map((row) => `${row.startOn}..${row.endOn}`)).toEqual([
      "2027-03-02..2027-03-12",
      "2027-03-16..2027-03-31",
    ]);
  });

  it("refuses a role without duty.write", async () => {
    const teacher = await makeUser("teacher");

    await expect(ensureCycles(teacher, "half_month", "2026-11-01", "2026-11-30")).rejects.toThrow(
      /duty\.write/,
    );
  });
});

describe("editing cycles", () => {
  it("rejects dates that would run into another cycle", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");

    await expect(
      saveCycleDates(admin, { id: first.id, startOn: "2027-03-01", endOn: "2027-03-20" }),
    ).rejects.toThrow(/overlap/i);
  });

  it("rejects dates in the wrong order", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");

    await expect(
      saveCycleDates(admin, { id: first.id, startOn: "2027-03-15", endOn: "2027-03-01" }),
    ).rejects.toThrow(/end date/i);
  });

  it("splits a cycle into two that touch", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");

    await splitCycleAt(admin, { id: first.id, on: "2027-03-08" });

    expect((await cyclesInOrder()).map((row) => `${row.startOn}..${row.endOn}`)).toEqual([
      "2027-03-01..2027-03-07",
      "2027-03-08..2027-03-15",
      "2027-03-16..2027-03-31",
    ]);
  });

  it("refuses a split on the cycle's first day", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");

    await expect(splitCycleAt(admin, { id: first.id, on: "2027-03-01" })).rejects.toThrow(
      /split date/i,
    );
  });

  it("merges touching cycles and moves the second one's teams", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first, second] = await cyclesInOrder();
    if (!first || !second) throw new Error("missing cycle");

    const [teamRow] = await getDb()
      .insert(team)
      .values({ cycleId: second.id, label: "Team A" })
      .returning({ id: team.id });
    if (!teamRow) throw new Error("insert failed");

    await mergeCyclePair(admin, { id: second.id, withId: first.id });

    const rows = await cyclesInOrder();
    expect(rows.map((row) => `${row.startOn}..${row.endOn}`)).toEqual(["2027-03-01..2027-03-31"]);

    const [moved] = await getDb().select().from(team).where(eq(team.id, teamRow.id));
    expect(moved?.cycleId).toBe(first.id);
  });

  it("refuses to merge cycles that do not touch", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-04-30");
    const rows = await cyclesInOrder();
    const first = rows[0];
    const third = rows[2];
    if (!first || !third) throw new Error("missing cycle");

    await expect(mergeCyclePair(admin, { id: first.id, withId: third.id })).rejects.toThrow(
      /touch/i,
    );
  });

  it("pauses a cycle", async () => {
    const admin = await makeUser("admin");
    await ensureCycles(admin, "half_month", "2027-03-01", "2027-03-31");
    const [first] = await cyclesInOrder();
    if (!first) throw new Error("missing cycle");

    await changeCycleStatus(admin, { id: first.id, status: "paused" });

    const [paused] = await getDb().select().from(cycle).where(eq(cycle.id, first.id));
    expect(paused?.status).toBe("paused");
  });
});
