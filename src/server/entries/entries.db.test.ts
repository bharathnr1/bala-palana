import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { strings } from "@/lib/strings";
import { AppError } from "@/server/auth/errors";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, child, entry, entryTag, lookup } from "@/server/db/schema";

import { addFollowUp, createEntries, deleteEntry, setEntryStatus, updateEntry } from "./mutations";
import { getEntryWithThread, listEntriesForChild } from "./queries";
import { observeLookups } from "./lookups";
import { resetDatabase } from "../../../tests/db/helpers";

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

async function entryRow(id: string) {
  const [row] = await getDb().select().from(entry).where(eq(entry.id, id));
  if (!row) throw new Error("entry missing");
  return row;
}

async function categoryId(key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, "entry_category"), eq(lookup.key, key)))
    .limit(1);
  if (!row) throw new Error(`missing category ${key}`);
  return row.id;
}

describe("createEntries", () => {
  it("writes five rows with a single group key for a group save", async () => {
    const admin = await makeUser("admin");
    const ids = ["A", "B", "C", "D", "E"].map(async (name) => makeChild(name));
    const childIds = await Promise.all(ids);

    const result = await createEntries(admin, {
      childIds,
      categoryKey: "observation",
      note: "Sang the morning prayer well.",
    });

    expect(result.ids).toHaveLength(5);
    expect(result.groupKey).toBeTruthy();
    const rows = await getDb().select().from(entry);
    expect(rows).toHaveLength(5);
    expect(new Set(rows.map((row) => row.groupKey))).toEqual(new Set([result.groupKey]));
  });

  it("leaves group_key null for a single child", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Solo");

    const result = await createEntries(admin, { childIds: [childId], categoryKey: "observation" });

    expect(result.groupKey).toBeNull();
    expect((await entryRow(result.ids[0]!)).groupKey).toBeNull();
  });

  it("opens a follow-up for a concern but not for an observation", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Concerned");

    const concern = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "concern",
      note: "Needs help with reading.",
    });
    expect((await entryRow(concern.ids[0]!)).status).toBe("open");

    const observation = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Cheerful today.",
    });
    expect((await entryRow(observation.ids[0]!)).status).toBeNull();
  });

  it("requires a concern as the parent of a corrective action", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Action");

    await expect(
      createEntries(admin, { childIds: [childId], categoryKey: "corrective_action", note: "No parent" }),
    ).rejects.toThrow(AppError);

    const observation = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "observation",
    });
    await expect(
      createEntries(admin, {
        childIds: [childId],
        categoryKey: "corrective_action",
        parentId: observation.ids[0]!,
      }),
    ).rejects.toThrow(strings.entries.errors.followUpParent);

    const concern = await createEntries(admin, { childIds: [childId], categoryKey: "concern" });
    const action = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "corrective_action",
      parentId: concern.ids[0]!,
      note: "Sat with her twice a week.",
    });
    expect((await entryRow(action.ids[0]!)).parentId).toBe(concern.ids[0]);
  });

  it("stores tags on every row of a group entry", async () => {
    const admin = await makeUser("admin");
    const ids = [await makeChild("Tag A"), await makeChild("Tag B")];

    await createEntries(admin, {
      childIds: ids,
      categoryKey: "observation",
      tagKeys: ["improving", "participation"],
    });

    const tags = await getDb().select().from(entryTag);
    expect(tags).toHaveLength(4);
  });

  it("refuses a restricted category to a teacher", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Health");

    await expect(
      createEntries(teacher, { childIds: [childId], categoryKey: "health", note: "Fever" }),
    ).rejects.toThrow(AppError);
    expect(await getDb().select().from(entry)).toHaveLength(0);
  });

  it("refuses a role without entry.create", async () => {
    const management = await makeUser("management");
    const childId = await makeChild("Managed");

    await expect(
      createEntries(management, { childIds: [childId], categoryKey: "observation" }),
    ).rejects.toThrow(AppError);
  });
});

describe("observeLookups", () => {
  it("offers the restricted category only to a reader who may see it", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher");

    const forAdmin = await observeLookups(admin);
    const forTeacher = await observeLookups(teacher);

    expect(forAdmin.categories.map((row) => row.key)).toContain("health");
    expect(forTeacher.categories.map((row) => row.key)).not.toContain("health");
    expect(forTeacher.tags.length).toBeGreaterThan(0);
  });
});

describe("updateEntry", () => {
  it("lets an author edit their own note but not someone else's", async () => {
    const teacher = await makeUser("teacher");
    const other = await makeUser("teacher");
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("Edited");

    const created = await createEntries(teacher, {
      childIds: [childId],
      categoryKey: "observation",
      note: "First note.",
    });
    const id = created.ids[0]!;

    await updateEntry(teacher, { id, note: "Second note." });
    expect((await entryRow(id)).note).toBe("Second note.");

    await expect(updateEntry(other, { id, note: "Not mine." })).rejects.toThrow(
      strings.entries.errors.forbidden,
    );

    await updateEntry(coordinator, { id, note: "Edited by a coordinator." });
    expect((await entryRow(id)).note).toBe("Edited by a coordinator.");
  });
});

describe("deleteEntry", () => {
  it("deletes an author's own entry within 24 hours", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Deleted");
    const created = await createEntries(teacher, {
      childIds: [childId],
      categoryKey: "observation",
    });

    await deleteEntry(teacher, { id: created.ids[0]! });
    expect((await entryRow(created.ids[0]!)).deletedAt).toBeInstanceOf(Date);
  });

  it("refuses the author's own entry after 24 hours", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Old");
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const [row] = await getDb()
      .insert(entry)
      .values({
        childId,
        categoryId: await categoryId("observation"),
        note: "Old note.",
        authorId: teacher.id,
        createdAt: old,
      })
      .returning({ id: entry.id });

    await expect(deleteEntry(teacher, { id: row!.id })).rejects.toThrow(
      strings.entries.errors.deleteTooLate,
    );
    expect((await entryRow(row!.id)).deletedAt).toBeNull();
  });

  it("lets entry.delete_any remove anyone's entry at any age", async () => {
    const teacher = await makeUser("teacher");
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("Old but removable");
    const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
    const [row] = await getDb()
      .insert(entry)
      .values({
        childId,
        categoryId: await categoryId("observation"),
        note: "Old note.",
        authorId: teacher.id,
        createdAt: old,
      })
      .returning({ id: entry.id });

    await deleteEntry(coordinator, { id: row!.id });
    expect((await entryRow(row!.id)).deletedAt).toBeInstanceOf(Date);
  });
});

describe("status and thread", () => {
  it("closes and reopens a follow-up, recording who closed it", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Followed up");
    const created = await createEntries(teacher, {
      childIds: [childId],
      categoryKey: "concern",
      note: "Needs help.",
    });
    const id = created.ids[0]!;

    await setEntryStatus(teacher, { id, status: "closed" });
    const closed = await entryRow(id);
    expect(closed.status).toBe("closed");
    expect(closed.closedBy).toBe(teacher.id);

    await setEntryStatus(teacher, { id, status: "open" });
    const reopened = await entryRow(id);
    expect(reopened.status).toBe("open");
    expect(reopened.closedAt).toBeNull();
  });

  it("adds a follow-up as a child row and returns the thread", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Thread");
    const concern = await createEntries(teacher, {
      childIds: [childId],
      categoryKey: "concern",
      note: "Parent raised it.",
    });
    const parentId = concern.ids[0]!;

    const reply = await addFollowUp(teacher, { parentId, note: "Spoke to the parent." });
    expect((await entryRow(reply.id)).parentId).toBe(parentId);

    const thread = await getEntryWithThread(teacher, parentId);
    expect(thread.replies.map((row) => row.id)).toEqual([reply.id]);
  });
});

describe("restricted filtering", () => {
  it("never returns a restricted entry to a teacher", async () => {
    const admin = await makeUser("admin");
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Privacy");

    const health = await createEntries(admin, {
      childIds: [childId],
      categoryKey: "health",
      note: "Asthma; keep the inhaler in the office.",
    });
    await createEntries(admin, {
      childIds: [childId],
      categoryKey: "observation",
      note: "Visible to all staff.",
    });

    const forTeacher = await listEntriesForChild(teacher, childId);
    expect(forTeacher.rows).toHaveLength(1);
    expect(forTeacher.rows[0]?.categoryKey).toBe("observation");

    const forAdmin = await listEntriesForChild(admin, childId);
    expect(forAdmin.rows.map((row) => row.categoryKey).sort()).toEqual(["health", "observation"]);

    await expect(getEntryWithThread(teacher, health.ids[0]!)).rejects.toThrow(
      strings.entries.errors.notFound,
    );
    await expect(getEntryWithThread(admin, health.ids[0]!)).resolves.toBeTruthy();
  });
});
