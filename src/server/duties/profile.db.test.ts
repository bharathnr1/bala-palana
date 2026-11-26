import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { addDaysISO, todayISO } from "@/lib/dates";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, cycle, lookup, team, teamMember } from "@/server/db/schema";
import { createEntries } from "@/server/entries/mutations";
import { resetDatabase } from "../../../tests/db/helpers";

import { childDutyCounts, childDutyHistory, childResponsibilities } from "./profile";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
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

async function makeChild(name: string): Promise<string> {
  const [row] = await getDb()
    .insert(child)
    .values({ fullName: name, stage: "student" })
    .returning({ id: child.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function dutyId(key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(sql`${lookup.kind} = 'duty' and ${lookup.key} = ${key}`)
    .limit(1);
  if (!row) throw new Error("missing duty");
  return row.id;
}

describe("childResponsibilities", () => {
  it("splits current roles from past ones", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("ROLES Child");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "responsibility",
      details: { title: "Class monitor", from: addDaysISO(todayISO(), -30) },
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "responsibility",
      details: {
        title: "Pooja lead",
        from: addDaysISO(todayISO(), -60),
        to: addDaysISO(todayISO(), -1),
      },
    });

    const roles = await childResponsibilities(coordinator, childId);

    expect(roles.map((role) => [role.title, role.isCurrent])).toEqual([
      ["Class monitor", true],
      ["Pooja lead", false],
    ]);
  });

  it("ignores a responsibility entry with a broken details shape", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("BROKEN Child");
    const [category] = await getDb()
      .select({ id: lookup.id })
      .from(lookup)
      .where(sql`${lookup.kind} = 'entry_category' and ${lookup.key} = 'responsibility'`)
      .limit(1);
    if (!category) throw new Error("missing category");

    await getDb().execute(sql`
      insert into entry (child_id, category_id, author_id, details)
      values (${childId}, ${category.id}, ${coordinator.id}, '{"nothing":"here"}'::jsonb)
    `);

    expect(await childResponsibilities(coordinator, childId)).toEqual([]);
  });
});

describe("duty history and counts", () => {
  it("lists the cycles served and totals them per duty", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("DUTY Child");
    const pooja = await dutyId("pooja");

    for (const [startOn, endOn] of [
      ["2026-11-01", "2026-11-15"],
      ["2026-11-16", "2026-11-30"],
    ] as const) {
      const [cycleRow] = await getDb()
        .insert(cycle)
        .values({ startOn, endOn })
        .returning({ id: cycle.id });
      if (!cycleRow) throw new Error("insert failed");
      const [teamRow] = await getDb()
        .insert(team)
        .values({ cycleId: cycleRow.id, dutyId: pooja, label: "Team A" })
        .returning({ id: team.id });
      if (!teamRow) throw new Error("insert failed");
      await getDb()
        .insert(teamMember)
        .values({ teamId: teamRow.id, childId, role: "lead" });
    }

    const history = await childDutyHistory(coordinator, childId);
    expect(history).toHaveLength(2);
    expect(history[0]?.cycleStartOn).toBe("2026-11-16");
    expect(history[0]?.dutyLabel).toBe("Pooja");
    expect(history[0]?.teamLabel).toBe("Team A");
    expect(history[0]?.role).toBe("lead");

    const counts = await childDutyCounts(coordinator, childId, "2026-27");
    expect(counts).toEqual([{ dutyId: pooja, dutyLabel: "Pooja", cyclesServed: 2 }]);
  });
});
