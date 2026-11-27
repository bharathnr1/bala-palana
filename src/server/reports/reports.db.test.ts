import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { subjectAverages } from "@/lib/grade-summary";
import type { SessionUser } from "@/server/auth/session";
import { getDb } from "@/server/db/client";
import { appUser, assessment, child, lookup } from "@/server/db/schema";
import { resetDatabase } from "../../../tests/db/helpers";

import { gradeSubjectSummary, reportLookups } from "./queries";

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

type Row = {
  childId: string;
  termKey: string;
  marks: string | null;
  maxMarks: string | null;
  gradeLetter?: string;
  subjectKey?: string;
  gradeKey?: string;
};

/** A grade-5 assessment, the shape both tests need. */
async function insertMaths(admin: SessionUser, row: Row): Promise<void> {
  await getDb()
    .insert(assessment)
    .values({
      childId: row.childId,
      academicYear: "2026-27",
      gradeId: await lookupId("grade", row.gradeKey ?? "grade_5"),
      termId: await lookupId("term", row.termKey),
      subjectId: await lookupId("subject", row.subjectKey ?? "mathematics"),
      marks: row.marks,
      maxMarks: row.maxMarks,
      gradeLetter: row.gradeLetter ?? null,
      recordedBy: admin.id,
    });
}

describe("gradeSubjectSummary", () => {
  it("averages the marks a hand-computed fixture gives", async () => {
    const admin = await makeUser("admin");
    const [asha, bala, chandra, devi] = await Promise.all([
      makeChild("Asha"),
      makeChild("Bala"),
      makeChild("Chandra"),
      makeChild("Devi"),
    ]);

    // (80 + 90 + 70) ÷ 3 = 80.0
    await insertMaths(admin, { childId: asha, termKey: "term_1", marks: "80", maxMarks: "100" });
    await insertMaths(admin, { childId: bala, termKey: "term_1", marks: "90", maxMarks: "100" });
    await insertMaths(admin, { childId: chandra, termKey: "term_1", marks: "70", maxMarks: "100" });
    // A letter and a mark without a maximum cannot be averaged (D10).
    await insertMaths(admin, {
      childId: devi,
      termKey: "term_1",
      marks: null,
      maxMarks: null,
      gradeLetter: "A",
    });
    await insertMaths(admin, {
      childId: devi,
      termKey: "term_1",
      subjectKey: "english",
      marks: "50",
      maxMarks: null,
    });
    // 60 of 80 = 75.0
    await insertMaths(admin, { childId: asha, termKey: "term_2", marks: "60", maxMarks: "80" });

    const rows = await gradeSubjectSummary(admin, { academicYear: "2026-27" });
    expect(rows).toEqual([
      {
        academicYear: "2026-27",
        grade: "Grade 5",
        term: "Term 1",
        subject: "Mathematics",
        avgPct: 80,
        n: 3,
      },
      {
        academicYear: "2026-27",
        grade: "Grade 5",
        term: "Term 2",
        subject: "Mathematics",
        avgPct: 75,
        n: 1,
      },
    ]);

    expect(subjectAverages(rows)).toEqual([{ subject: "Mathematics", pct: 78.8, n: 4 }]);
  });

  it("filters by grade and term labels", async () => {
    const admin = await makeUser("admin");
    const childId = await makeChild("Filtered");
    await insertMaths(admin, { childId, termKey: "term_1", marks: "60", maxMarks: "100" });
    await insertMaths(admin, { childId, termKey: "term_2", marks: "90", maxMarks: "100" });

    const termOne = await gradeSubjectSummary(admin, {
      academicYear: "2026-27",
      grade: "Grade 5",
      term: "Term 1",
    });
    expect(termOne.map((row) => row.avgPct)).toEqual([60]);

    const otherGrade = await gradeSubjectSummary(admin, {
      academicYear: "2026-27",
      grade: "Grade 6",
    });
    expect(otherGrade).toEqual([]);
  });

  it("orders grades by their school order, not alphabetically", async () => {
    const admin = await makeUser("admin");
    const [five, ten] = await Promise.all([makeChild("Five"), makeChild("Ten")]);

    await insertMaths(admin, {
      childId: ten,
      termKey: "term_1",
      gradeKey: "grade_10",
      marks: "90",
      maxMarks: "100",
    });
    await insertMaths(admin, {
      childId: five,
      termKey: "term_1",
      marks: "60",
      maxMarks: "100",
    });

    const rows = await gradeSubjectSummary(admin, { academicYear: "2026-27" });
    expect(rows.map((row) => row.grade)).toEqual(["Grade 5", "Grade 10"]);
  });

  it("refuses a teacher, who has no report.read", async () => {
    const teacher = await makeUser("teacher");
    await expect(gradeSubjectSummary(teacher, { academicYear: "2026-27" })).rejects.toThrow(
      "report.read",
    );
    await expect(reportLookups(teacher)).rejects.toThrow("report.read");
  });

  it("offers the grade and term labels the view stores", async () => {
    const management = await makeUser("management");

    const lookups = await reportLookups(management);
    expect(lookups.grades[0]).toBe("Grade 1");
    expect(lookups.terms).toEqual(["Term 1", "Term 2", "Annual"]);
  });
});
