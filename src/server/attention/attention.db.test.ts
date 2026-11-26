import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { addDaysISO, todayISO } from "@/lib/dates";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, enrolment, entry, lookup, setting } from "@/server/db/schema";
import { vNeedsAttention } from "@/server/db/schema/views";
import { createEntries, setEntryStatus } from "@/server/entries/mutations";
import { resetDatabase } from "../../../tests/db/helpers";

import { attentionCount, listNeedsAttention } from "./queries";

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

async function makeChild(input: { name?: string; joinedOn?: string } = {}): Promise<string> {
  const [row] = await getDb()
    .insert(child)
    .values({
      fullName: input.name ?? "ATTENTION Child",
      stage: "student",
      joinedOn: input.joinedOn ?? todayISO(),
    })
    .returning({ id: child.id });
  if (!row) throw new Error("insert failed");
  return row.id;
}

async function lookupId(kind: string, key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(sql`${lookup.kind} = ${kind} and ${lookup.key} = ${key}`)
    .limit(1);
  if (!row) throw new Error(`missing lookup ${kind}.${key}`);
  return row.id;
}

async function flagged(childId: string) {
  const rows = await getDb()
    .select()
    .from(vNeedsAttention)
    .where(eq(vNeedsAttention.childId, childId));
  return rows[0];
}

describe("v_needs_attention", () => {
  it("flags an open concern and clears when it is closed", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();

    const concern = await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "concern",
      note: "Needs help with reading.",
    });

    const open = await flagged(childId);
    expect(open?.openConcerns).toBe(1);
    expect(open?.reasons).toContain("open_concerns");

    await setEntryStatus(coordinator, { id: concern.ids[0] ?? "", status: "closed" });

    expect(await flagged(childId)).toBeUndefined();
  });

  it("flags an overdue follow-up at its date and clears when it moves", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();

    const created = await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Watch her spellings.",
      followUpOn: addDaysISO(todayISO(), -1),
    });

    const overdue = await flagged(childId);
    expect(overdue?.overdueFollowUps).toBe(1);
    expect(overdue?.reasons).toContain("overdue_follow_ups");

    // Moving the follow-up into the future leaves it open but not overdue.
    await getDb()
      .update(entry)
      .set({ followUpOn: addDaysISO(todayISO(), 3) })
      .where(eq(entry.id, created.ids[0] ?? ""));

    expect(await flagged(childId)).toBeUndefined();
  });

  it("flags a child with no entry since the threshold and clears on a new one", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild({ joinedOn: addDaysISO(todayISO(), -40) });

    const stale = await flagged(childId);
    expect(stale?.daysSinceLastEntry).toBeGreaterThanOrEqual(30);
    expect(stale?.reasons).toContain("stale");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Back in class today.",
    });

    expect(await flagged(childId)).toBeUndefined();
  });

  it("uses the configured needs-attention threshold", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild({ joinedOn: addDaysISO(todayISO(), -40) });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Seen fifteen days ago.",
      occurredAt: new Date(`${addDaysISO(todayISO(), -15)}T05:00:00+05:30`),
    });

    await expect(flagged(childId)).resolves.toBeUndefined();

    await getDb()
      .update(setting)
      .set({ value: 10 })
      .where(eq(setting.key, "needs_attention_days"));

    expect((await flagged(childId))?.reasons).toContain("stale");
  });

  it("flags concerns across several subjects", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();
    await getDb().insert(enrolment).values({ childId, academicYear: "2026-27" });

    for (const subjectKey of ["english", "mathematics"]) {
      await createEntries(coordinator, {
        childIds: [childId],
        categoryKey: "concern",
        subjectKey,
        note: `Concern in ${subjectKey}.`,
      });
    }

    const row = await flagged(childId);
    expect(row?.concernSubjects).toBe(2);
    expect(row?.reasons).toContain("concern_subjects");
  });

  it("does not flag a restricted follow-up", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "health",
      note: "Reviewed by the doctor.",
      followUpOn: addDaysISO(todayISO(), -5),
    });

    expect(await flagged(childId)).toBeUndefined();
  });
});

describe("listNeedsAttention", () => {
  it("returns the flagged child with grade and last author, worst first", async () => {
    const coordinator = await makeUser("coordinator");
    const calm = await makeChild({ name: "CALM Child" });
    const urgent = await makeChild({ name: "URGENT Child" });
    const gradeId = await lookupId("grade", "grade_5");
    const year = "2026-27";

    await getDb().insert(enrolment).values([
      { childId: calm, academicYear: year, gradeId },
      { childId: urgent, academicYear: year, gradeId },
    ]);

    await createEntries(coordinator, {
      childIds: [urgent],
      categoryKey: "concern",
      note: "Needs help.",
      followUpOn: addDaysISO(todayISO(), -2),
    });

    const rows = await listNeedsAttention(coordinator);

    expect(rows[0]?.childId).toBe(urgent);
    expect(rows[0]?.gradeLabel).toBe("Grade 5");
    expect(rows[0]?.lastAuthorName).toBe(coordinator.name);
    expect(rows.some((row) => row.childId === calm)).toBe(false);
  });

  it("applies the grade filter", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();
    const grade5 = await lookupId("grade", "grade_5");
    const grade6 = await lookupId("grade", "grade_6");

    await getDb()
      .insert(enrolment)
      .values({ childId, academicYear: "2026-27", gradeId: grade5 });
    await createEntries(coordinator, { childIds: [childId], categoryKey: "concern", note: "Help." });

    expect(await listNeedsAttention(coordinator, { gradeId: grade5 })).toHaveLength(1);
    expect(await listNeedsAttention(coordinator, { gradeId: grade6 })).toHaveLength(0);
  });

  it("includes a child who has no enrolment for the current year yet", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();

    await createEntries(coordinator, { childIds: [childId], categoryKey: "concern", note: "Help." });

    const rows = await listNeedsAttention(coordinator);
    expect(rows.some((row) => row.childId === childId)).toBe(true);
  });

  it("counts the flagged children for the Home card", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild();
    await createEntries(coordinator, { childIds: [childId], categoryKey: "concern", note: "Help." });

    expect(await attentionCount(coordinator)).toBe(1);
  });
});
