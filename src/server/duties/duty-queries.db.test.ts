import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { getDb } from "@/server/db/client";
import { child, cycle, lookup, team, teamMember } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

async function dutyId(key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(sql`${lookup.kind} = 'duty' and ${lookup.key} = ${key}`)
    .limit(1);
  if (!row) throw new Error(`missing duty ${key}`);
  return row.id;
}

async function makeChild(name: string): Promise<string> {
  const [row] = await getDb().insert(child).values({ fullName: name }).returning({ id: child.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function makeCycle(startOn: string, endOn: string, status: "planned" | "skipped" = "planned") {
  const [row] = await getDb()
    .insert(cycle)
    .values({ startOn, endOn, status })
    .returning({ id: cycle.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function makeTeam(cycleId: string, duty: string) {
  const [row] = await getDb()
    .insert(team)
    .values({ cycleId, dutyId: duty })
    .returning({ id: team.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function onDuty(duty: string, on: string) {
  const rows = await getDb().execute<{ child_id: string; role: string }>(
    sql`select child_id, role::text as role from fn_on_duty(${duty}, ${on})`,
  );
  return rows.map((row) => ({ childId: row.child_id, role: row.role }));
}

describe("fn_on_duty", () => {
  it("follows a mid-cycle swap across the boundary", async () => {
    const pooja = await dutyId("pooja");
    const cycleId = await makeCycle("2026-11-01", "2026-11-15");
    const teamId = await makeTeam(cycleId, pooja);
    const outgoing = await makeChild("OUTGOING Child");
    const incoming = await makeChild("INCOMING Child");

    await getDb().insert(teamMember).values([
      { teamId, childId: outgoing, toOn: "2026-11-07" },
      { teamId, childId: incoming, fromOn: "2026-11-08" },
    ]);

    expect(await onDuty(pooja, "2026-11-07")).toEqual([{ childId: outgoing, role: "member" }]);
    expect(await onDuty(pooja, "2026-11-08")).toEqual([{ childId: incoming, role: "member" }]);
  });

  it("returns leads first and only members of the cycle's day", async () => {
    const pooja = await dutyId("pooja");
    const cycleId = await makeCycle("2026-11-01", "2026-11-15");
    const teamId = await makeTeam(cycleId, pooja);
    const lead = await makeChild("LEAD Child");
    const member = await makeChild("MEMBER Child");

    await getDb().insert(teamMember).values([
      { teamId, childId: member },
      { teamId, childId: lead, role: "lead" },
    ]);

    const rows = await onDuty(pooja, "2026-11-03");
    expect(rows.map((row) => row.role)).toEqual(["lead", "member"]);
    expect(rows[0]?.childId).toBe(lead);

    expect(await onDuty(pooja, "2026-11-20")).toEqual([]);
  });

  it("returns nobody for a skipped cycle", async () => {
    const pooja = await dutyId("pooja");
    const cycleId = await makeCycle("2026-11-01", "2026-11-15", "skipped");
    const teamId = await makeTeam(cycleId, pooja);
    const childId = await makeChild("SKIPPED Child");
    await getDb().insert(teamMember).values({ teamId, childId });

    expect(await onDuty(pooja, "2026-11-03")).toEqual([]);
  });
});

describe("v_duty_counts", () => {
  it("counts the cycles a child served, per duty and academic year", async () => {
    const pooja = await dutyId("pooja");
    const childId = await makeChild("COUNTED Child");

    for (const [startOn, endOn] of [
      ["2026-11-01", "2026-11-15"],
      ["2026-11-16", "2026-11-30"],
    ] as const) {
      const cycleId = await makeCycle(startOn, endOn);
      const teamId = await makeTeam(cycleId, pooja);
      await getDb().insert(teamMember).values({ teamId, childId });
    }

    const [row] = await getDb().execute<{ academic_year: string; cycles_served: number }>(
      sql`select academic_year, cycles_served from v_duty_counts where child_id = ${childId} and duty_id = ${pooja}`,
    );

    expect(row?.academic_year).toBe("2026-27");
    expect(Number(row?.cycles_served)).toBe(2);
  });

  it("leaves skipped cycles out of the count", async () => {
    const pooja = await dutyId("pooja");
    const childId = await makeChild("SKIP Child");
    const cycleId = await makeCycle("2026-11-01", "2026-11-15", "skipped");
    const teamId = await makeTeam(cycleId, pooja);
    await getDb().insert(teamMember).values({ teamId, childId });

    const rows = await getDb().execute(sql`select * from v_duty_counts where child_id = ${childId}`);
    expect(rows).toHaveLength(0);
  });
});
