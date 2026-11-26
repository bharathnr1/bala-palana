import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { addDaysISO, todayISO } from "@/lib/dates";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, entry } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { createEntries, deleteEntry, setEntryStatus } from "../entries/mutations";
import { listOpenFollowUps } from "./queries";

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

describe("listOpenFollowUps", () => {
  it("lists only open entries with a follow-up date, soonest first", async () => {
    const coordinator = await makeUser("coordinator");
    const first = await makeChild("FIRST Child");
    const second = await makeChild("SECOND Child");

    const overdue = await createEntries(coordinator, {
      childIds: [first],
      categoryKey: "observation",
      note: "Overdue",
      followUpOn: addDaysISO(todayISO(), -3),
    });
    await createEntries(coordinator, {
      childIds: [second],
      categoryKey: "observation",
      note: "Upcoming",
      followUpOn: addDaysISO(todayISO(), 4),
    });
    await createEntries(coordinator, {
      childIds: [first],
      categoryKey: "observation",
      note: "No date",
    });
    const closing = await createEntries(coordinator, {
      childIds: [second],
      categoryKey: "observation",
      note: "Will close",
      followUpOn: addDaysISO(todayISO(), 1),
    });
    await setEntryStatus(coordinator, { id: closing.ids[0] ?? "", status: "closed" });

    const { rows } = await listOpenFollowUps(coordinator);

    expect(rows.map((row) => row.note)).toEqual(["Overdue", "Upcoming"]);
    expect(rows[0]?.entryId).toBe(overdue.ids[0]);
    expect(rows[0]?.childName).toBe("FIRST Child");
    expect(rows[0]?.followUpOn).toBe(addDaysISO(todayISO(), -3));
  });

  it("filters to the reader's own follow-ups", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const childId = await makeChild("MINE Child");

    await createEntries(teacher, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Teacher's",
      followUpOn: addDaysISO(todayISO(), 2),
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Coordinator's",
      followUpOn: addDaysISO(todayISO(), 3),
    });

    const mine = await listOpenFollowUps(teacher, { mine: true });
    expect(mine.rows.map((row) => row.note)).toEqual(["Teacher's"]);

    const all = await listOpenFollowUps(coordinator);
    expect(all.rows).toHaveLength(2);
  });

  it("never shows a restricted follow-up to a teacher", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const childId = await makeChild("HEALTH Child");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "health",
      note: "Doctor review",
      followUpOn: addDaysISO(todayISO(), 1),
    });

    expect((await listOpenFollowUps(teacher)).rows).toHaveLength(0);
    expect((await listOpenFollowUps(coordinator)).rows).toHaveLength(1);
  });

  it("drops a soft-deleted follow-up", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("DELETED Child");

    const created = await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Mistake",
      followUpOn: addDaysISO(todayISO(), 1),
    });
    await deleteEntry(coordinator, { id: created.ids[0] ?? "" });

    const rows = await getDb().select({ id: entry.id }).from(entry).where(eq(entry.id, created.ids[0] ?? ""));
    expect(rows).toHaveLength(1);
    expect((await listOpenFollowUps(coordinator)).rows).toHaveLength(0);
  });
});
