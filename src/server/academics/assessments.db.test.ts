import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { strings } from "@/lib/strings";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, assessment, child, enrolment, entry, lookup } from "@/server/db/schema";
import { createEntries, setEntryStatus } from "@/server/entries/mutations";
import { listChildTimeline } from "@/server/entries/timeline";
import { resetDatabase } from "../../../tests/db/helpers";

import {
  deleteAssessment,
  upsertAssessment,
  type UpsertAssessmentInput,
} from "./mutations";
import {
  assessmentOptions,
  childSubjectConcerns,
  listChildAssessments,
  listClassAssessments,
  listClassChildren,
} from "./queries";

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

type InputOverrides = Partial<Omit<UpsertAssessmentInput, "childId">> & { childId: string };

function input(overrides: InputOverrides): UpsertAssessmentInput {
  return {
    academicYear: "2026-27",
    gradeKey: "grade_5",
    termKey: "term_1",
    subjectKey: "mathematics",
    ...overrides,
  };
}

describe("upsertAssessment", () => {
  it("replaces the row for the same child, year, term and subject", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Saved");

    const first = await upsertAssessment(teacher, {
      ...input({ childId }),
      marks: 61,
      maxMarks: 100,
    });
    const second = await upsertAssessment(teacher, {
      ...input({ childId }),
      marks: 74.5,
      maxMarks: 100,
    });

    expect(second.id).toBe(first.id);
    const rows = await getDb().select().from(assessment);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.marks).toBe("74.50");
    expect(rows[0]?.recordedBy).toBe(teacher.id);
  });

  it("lets a teacher write but not management", async () => {
    const teacher = await makeUser("teacher");
    const management = await makeUser("management");
    const childId = await makeChild("Roles");

    await expect(
      upsertAssessment(management, { ...input({ childId }), marks: 80 }),
    ).rejects.toThrow("assessment.write");
    await expect(
      upsertAssessment(teacher, { ...input({ childId }), marks: 80 }),
    ).resolves.toBeTruthy();
  });

  it("refuses an unknown child", async () => {
    const teacher = await makeUser("teacher");

    await expect(
      upsertAssessment(teacher, {
        ...input({ childId: "00000000-0000-4000-8000-000000000000" }),
        marks: 50,
      }),
    ).rejects.toThrow(strings.academics.errors.childMissing);
  });
});

describe("database constraints (06-testing § Required tests by area)", () => {
  it("requires marks, a grade letter or a remark", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Empty");

    await expect(
      getDb().insert(assessment).values({
        childId,
        academicYear: "2026-27",
        termId: await lookupId("term", "term_1"),
        subjectId: await lookupId("subject", "english"),
        recordedBy: admin.id,
      }),
    ).rejects.toThrow();
  });

  it("refuses marks above max_marks", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Over");

    await expect(
      getDb().insert(assessment).values({
        childId,
        academicYear: "2026-27",
        termId: await lookupId("term", "term_1"),
        subjectId: await lookupId("subject", "english"),
        marks: "101",
        maxMarks: "100",
        recordedBy: admin.id,
      }),
    ).rejects.toThrow();

    await getDb().insert(assessment).values({
      childId,
      academicYear: "2026-27",
      termId: await lookupId("term", "term_1"),
      subjectId: await lookupId("subject", "english"),
      gradeLetter: "A",
      recordedBy: admin.id,
    });
    expect(await getDb().select().from(assessment)).toHaveLength(1);
  });
});

describe("deleteAssessment", () => {
  it("removes the row and reports an unknown id", async () => {
    const coordinator = await makeUser("coordinator");
    const childId = await makeChild("Deleted");
    const saved = await upsertAssessment(coordinator, {
      ...input({ childId }),
      remark: "Needs practice.",
    });

    await deleteAssessment(coordinator, { id: saved.id });
    expect(await getDb().select().from(assessment)).toHaveLength(0);

    await expect(
      deleteAssessment(coordinator, { id: saved.id }),
    ).rejects.toThrow(strings.academics.errors.notFound);
  });
});

describe("queries", () => {
  it("lists a child's years newest first, then term and subject order", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Historian");

    await upsertAssessment(admin, {
      ...input({ childId, academicYear: "2025-26", termKey: "term_2", subjectKey: "science" }),
      marks: 70,
    });
    await upsertAssessment(admin, {
      ...input({ childId, academicYear: "2026-27", termKey: "term_1" }),
      marks: 80,
    });

    const rows = await listChildAssessments(admin, childId);
    expect(rows.map((row) => [row.academicYear, row.termKey, row.subjectKey])).toEqual([
      ["2026-27", "term_1", "mathematics"],
      ["2025-26", "term_2", "science"],
    ]);
    expect(rows[0]?.marks).toBe(80);
    expect(rows[0]?.termLabel).toBe("Term 1");
  });

  it("filters a class by year, grade, term and subject", async () => {
    const admin = await makeUser("admin");
    const asha = await makeChild("Asha");
    const bala = await makeChild("Bala");
    const other = await makeChild("Other Grade");

    await upsertAssessment(admin, { ...input({ childId: asha }), marks: 88 });
    await upsertAssessment(admin, {
      ...input({ childId: bala, subjectKey: "english" }),
      marks: 66,
    });
    await upsertAssessment(admin, {
      ...input({ childId: other, gradeKey: "grade_6" }),
      marks: 99,
    });

    const term1 = await listClassAssessments(admin, {
      academicYear: "2026-27",
      gradeKey: "grade_5",
      termKey: "term_1",
    });
    expect(term1.map((row) => [row.childName, row.subjectKey])).toEqual([
      ["Asha", "mathematics"],
      ["Bala", "english"],
    ]);

    const maths = await listClassAssessments(admin, {
      academicYear: "2026-27",
      gradeKey: "grade_5",
      termKey: "term_1",
      subjectKey: "mathematics",
    });
    expect(maths.map((row) => row.childName)).toEqual(["Asha"]);
  });

  it("offers grades, terms and subjects to every reader, management included", async () => {
    const management = await makeUser("management");

    const options = await assessmentOptions(management);
    expect(options.grades.map((row) => row.key)).toContain("grade_5");
    expect(options.terms.map((row) => row.key)).toEqual(["term_1", "term_2", "annual"]);
    expect(options.subjects.map((row) => row.key)).toContain("mathematics");

    await expect(listChildAssessments(management, "00000000-0000-4000-8000-000000000000"))
      .resolves.toEqual([]);
  });
});

describe("listClassChildren", () => {
  it("lists the children enrolled in the grade for that year, by name", async () => {
    const admin = await makeUser("admin");
    const asha = await makeChild("Asha");
    const bala = await makeChild("Bala");
    const other = await makeChild("Other Grade");
    const gradeFive = await lookupId("grade", "grade_5");
    const gradeSix = await lookupId("grade", "grade_6");

    await getDb().insert(enrolment).values([
      { childId: asha, academicYear: "2026-27", gradeId: gradeFive },
      { childId: bala, academicYear: "2026-27", gradeId: gradeFive },
      { childId: other, academicYear: "2026-27", gradeId: gradeSix },
      { childId: other, academicYear: "2025-26", gradeId: gradeFive },
    ]);

    const rows = await listClassChildren(admin, {
      academicYear: "2026-27",
      gradeKey: "grade_5",
    });
    expect(rows.map((row) => row.fullName)).toEqual(["Asha", "Bala"]);
  });
});

describe("childSubjectConcerns", () => {
  it("counts open concerns per subject and hides restricted rows from a teacher", async () => {
    const coordinator = await makeUser("coordinator");
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Concerned");

    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "concern",
      subjectKey: "english",
      note: "Reading.",
    });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "concern",
      subjectKey: "english",
      note: "Spelling.",
    });
    const closed = await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "concern",
      subjectKey: "mathematics",
    });
    await setEntryStatus(coordinator, { id: closed.ids[0]!, status: "closed" });
    await createEntries(coordinator, { childIds: [childId], categoryKey: "concern" });
    await createEntries(coordinator, {
      childIds: [childId],
      categoryKey: "observation",
      subjectKey: "english",
    });

    // A restricted concern: the coordinator counts it, the teacher must not.
    const [concernCategory] = await getDb()
      .select({ id: lookup.id })
      .from(lookup)
      .where(and(eq(lookup.kind, "entry_category"), eq(lookup.key, "concern")))
      .limit(1);
    await getDb().insert(entry).values({
      childId,
      categoryId: concernCategory!.id,
      subjectId: await lookupId("subject", "english"),
      note: "Restricted concern.",
      authorId: coordinator.id,
      visibility: "restricted",
      status: "open",
    });

    const forCoordinator = await childSubjectConcerns(coordinator, childId);
    expect(forCoordinator.map((row) => [row.subjectKey, row.openCount])).toEqual([
      ["english", 3],
      [null, 1],
    ]);

    const forTeacher = await childSubjectConcerns(teacher, childId);
    expect(forTeacher.map((row) => [row.subjectKey, row.openCount])).toEqual([
      ["english", 2],
      [null, 1],
    ]);
  });
});

describe("journey timeline", () => {
  it("shows an assessment as its own compact row", async () => {
    const teacher = await makeUser("teacher");
    const childId = await makeChild("Timeline");

    await upsertAssessment(teacher, { ...input({ childId }), marks: 75 });

    const page = await listChildTimeline(teacher, childId);
    const found = page.events.find((event) => event.kind === "assessment");
    if (!found || found.kind !== "assessment") throw new Error("assessment row missing");
    expect(found.title).toBe("Mathematics · Term 1");
  });
});
