import { asc, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, cycle, lookup, team, teamMember } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { addTeamMembers, copyCycleTeams, moveTeamMember, setMemberDates } from "./mutations";

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

async function dutyId(): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(sql`${lookup.kind} = 'duty' and ${lookup.key} = 'pooja'`)
    .limit(1);
  if (!row) throw new Error("missing duty");
  return row.id;
}

async function makeChild(name: string, stage: "student" | "alumna" = "student"): Promise<string> {
  const [row] = await getDb()
    .insert(child)
    .values({ fullName: name, stage })
    .returning({ id: child.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function makeCycle(startOn: string, endOn: string): Promise<string> {
  const [row] = await getDb()
    .insert(cycle)
    .values({ startOn, endOn })
    .returning({ id: cycle.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function makeTeam(cycleId: string, duty: string): Promise<string> {
  const [row] = await getDb()
    .insert(team)
    .values({ cycleId, dutyId: duty, label: "Team A" })
    .returning({ id: team.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

describe("copyCycleTeams", () => {
  it("reproduces teams and leads and skips children who are no longer students", async () => {
    const admin = await makeUser("admin");
    const duty = await dutyId();
    const source = await makeCycle("2026-11-01", "2026-11-15");
    const target = await makeCycle("2026-11-16", "2026-11-30");
    const sourceTeam = await makeTeam(source, duty);

    const lead = await makeChild("LEAD Child");
    const member = await makeChild("MEMBER Child");
    const alumna = await makeChild("ALUMNA Child", "alumna");
    await getDb().insert(teamMember).values([
      { teamId: sourceTeam, childId: lead, role: "lead" },
      { teamId: sourceTeam, childId: member },
      { teamId: sourceTeam, childId: alumna },
    ]);

    await expect(copyCycleTeams(admin, { cycleId: target })).resolves.toEqual({
      teams: 1,
      members: 2,
    });

    const [copied] = await getDb()
      .select({ id: team.id })
      .from(team)
      .where(eq(team.cycleId, target));
    if (!copied) throw new Error("missing copied team");

    const roster = await getDb()
      .select({ childId: teamMember.childId, role: teamMember.role })
      .from(teamMember)
      .where(eq(teamMember.teamId, copied.id))
      .orderBy(asc(teamMember.role));

    expect(roster.map((row) => row.childId).sort()).toEqual([lead, member].sort());
    expect(roster.find((row) => row.childId === lead)?.role).toBe("lead");
    expect(roster.some((row) => row.childId === alumna)).toBe(false);
  });

  it("refuses when the target cycle already has teams", async () => {
    const admin = await makeUser("admin");
    const duty = await dutyId();
    await makeCycle("2026-11-01", "2026-11-15");
    const target = await makeCycle("2026-11-16", "2026-11-30");
    await makeTeam(target, duty);

    await expect(copyCycleTeams(admin, { cycleId: target })).rejects.toThrow(/already has teams/i);
  });
});

describe("board membership", () => {
  it("adds children once and refuses a non-student", async () => {
    const admin = await makeUser("admin");
    const duty = await dutyId();
    const cycleId = await makeCycle("2026-11-01", "2026-11-15");
    const teamId = await makeTeam(cycleId, duty);
    const student = await makeChild("STUDENT Child");
    const alumna = await makeChild("ALUMNA Child", "alumna");

    expect(await addTeamMembers(admin, { teamId, childIds: [student, student] })).toBe(1);
    await expect(addTeamMembers(admin, { teamId, childIds: [alumna] })).rejects.toThrow(
      /students/i,
    );
  });

  it("refuses to move a child into another cycle", async () => {
    const admin = await makeUser("admin");
    const duty = await dutyId();
    const cycleId = await makeCycle("2026-11-01", "2026-11-15");
    const otherCycle = await makeCycle("2026-11-16", "2026-11-30");
    const teamId = await makeTeam(cycleId, duty);
    const otherTeam = await makeTeam(otherCycle, duty);
    const student = await makeChild("MOVE Child");
    const [row] = await getDb()
      .insert(teamMember)
      .values({ teamId, childId: student })
      .returning({ id: teamMember.id });
    if (!row) throw new Error("insert failed");

    await expect(moveTeamMember(admin, { id: row.id, toTeamId: otherTeam })).rejects.toThrow(
      /same cycle/i,
    );
  });

  it("refuses a membership date outside the cycle", async () => {
    const admin = await makeUser("admin");
    const duty = await dutyId();
    const cycleId = await makeCycle("2026-11-01", "2026-11-15");
    const teamId = await makeTeam(cycleId, duty);
    const student = await makeChild("DATES Child");
    const [row] = await getDb()
      .insert(teamMember)
      .values({ teamId, childId: student })
      .returning({ id: teamMember.id });
    if (!row) throw new Error("insert failed");

    await expect(setMemberDates(admin, { id: row.id, toOn: "2026-11-20" })).rejects.toThrow(
      /inside the cycle/i,
    );
    await expect(setMemberDates(admin, { id: row.id, toOn: "2026-11-07" })).resolves.toBeUndefined();
  });
});
