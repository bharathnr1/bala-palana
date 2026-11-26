import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { groupTimelineByAcademicYear } from "@/lib/timeline";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, enrolment, entry, lookup } from "@/server/db/schema";
import { vChildTimeline } from "@/server/db/schema/views";
import { resetDatabase } from "../../../tests/db/helpers";

import { createEntries } from "./mutations";
import { listChildTimeline } from "./timeline";

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

async function lookupId(kind: string, key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, kind), eq(lookup.key, key)))
    .limit(1);
  if (!row) throw new Error(`missing lookup ${kind}.${key}`);
  return row.id;
}

describe("listChildTimeline", () => {
  it("orders newest first and groups across a year boundary", async () => {
    const admin = await makeUser("admin");
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("Timeline Child");

    const before = await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Older",
      occurredAt: new Date("2025-06-10T05:00:00Z"),
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Last day of the year",
      occurredAt: new Date("2026-05-31T18:00:00Z"),
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "First day of the new year",
      occurredAt: new Date("2026-06-01T04:00:00Z"),
    });

    // An enrolment row is the other source in the view.
    await getDb().insert(enrolment).values({
      childId,
      academicYear: "2025-26",
      gradeId: await lookupId("grade", "grade_5"),
      createdAt: new Date("2025-07-01T05:00:00Z"),
    });

    const page = await listChildTimeline(admin, childId);
    const notes = page.events.map((event) => (event.kind === "entry" ? event.entry.note : event.title));

    expect(notes).toEqual([
      "First day of the new year",
      "Last day of the year",
      "Grade 5",
      "Older",
    ]);

    const groups = groupTimelineByAcademicYear(page.events, 6);
    expect(groups.map((group) => group.academicYear)).toEqual(["2026-27", "2025-26"]);
    expect(groups[1]?.rows.map((row) => (row.kind === "entry" ? row.entry.id : row.id))).toContain(
      before.ids[0],
    );
  });

  it("filters by category and hides system rows then", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("Filtered Child");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      note: "An observation",
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "concern",
      note: "A concern",
    });
    await getDb().insert(enrolment).values({ childId, academicYear: "2026-27" });

    const page = await listChildTimeline(coordinator, childId, { categoryKey: "concern" });

    expect(page.events).toHaveLength(1);
    expect(page.events[0]?.kind).toBe("entry");
    expect(page.events[0]?.kind === "entry" ? page.events[0].entry.note : null).toBe("A concern");
  });

  it("never returns a restricted entry to a teacher", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Restricted Child");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "health",
      note: "Clinic visit",
    });

    const teacherPage = await listChildTimeline(teacher, childId);
    expect(teacherPage.events).toHaveLength(0);

    const coordinatorPage = await listChildTimeline(coordinator, childId);
    expect(coordinatorPage.events).toHaveLength(1);
  });

  it("leaves a soft-deleted entry out of the view", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Deleted Child");

    const created = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Typo",
    });
    await getDb()
      .update(entry)
      .set({ deletedAt: new Date() })
      .where(eq(entry.id, created.ids[0] ?? ""));

    const rows = await getDb().select().from(vChildTimeline).where(eq(vChildTimeline.childId, childId));
    expect(rows).toHaveLength(0);
  });
});
