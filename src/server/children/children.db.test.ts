import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "../../../tests/db/helpers";
import { getDb } from "@/server/db/client";
import {
  child,
  childGuardian,
  enrolment,
  guardian,
  lookup,
} from "@/server/db/schema";

import { currentAcademicYear, getChild, listChildren } from "./queries";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

async function gradeId(key: string): Promise<string> {
  const [row] = await getDb()
    .select({ id: lookup.id })
    .from(lookup)
    .where(and(eq(lookup.kind, "grade"), eq(lookup.key, key)))
    .limit(1);
  if (!row) throw new Error(`missing grade ${key}`);
  return row.id;
}

describe("listChildren", () => {
  it("finds Ananya with a three-letter search among 120 children in under 300 ms", async () => {
    const teacher = { role: "teacher" } as const;
    const others = Array.from({ length: 119 }, (_, index) => ({
      fullName: `Child ${String(index).padStart(3, "0")}`,
      stage: "student" as const,
    }));
    await getDb().insert(child).values([...others, { fullName: "Ananya Sharma", stage: "student" }]);

    // Warm the pool and the plan cache so the measurement is the query itself.
    await listChildren(teacher, { search: "sharma", stage: "student" });

    const started = performance.now();
    const result = await listChildren(teacher, { search: "ana", stage: "student" });
    const elapsed = performance.now() - started;

    expect(result.rows.map((row) => row.fullName)).toContain("Ananya Sharma");
    expect(elapsed).toBeLessThan(300);
  });

  it("filters by the grade of the current academic year", async () => {
    const coordinator = { role: "coordinator" } as const;
    const year = await currentAcademicYear();
    const grade1 = await gradeId("grade_1");
    const grade2 = await gradeId("grade_2");

    const rows = await getDb()
      .insert(child)
      .values([
        { fullName: "Asha One", stage: "student" },
        { fullName: "Bela Two", stage: "student" },
      ])
      .returning({ id: child.id });
    const [one, two] = rows;
    if (!one || !two) throw new Error("insert failed");

    await getDb()
      .insert(enrolment)
      .values([
        { childId: one.id, academicYear: year, gradeId: grade1 },
        { childId: two.id, academicYear: year, gradeId: grade2 },
      ]);

    const result = await listChildren(coordinator, { stage: "student", gradeKey: "grade_1" });
    expect(result.rows.map((row) => row.fullName)).toEqual(["Asha One"]);
    expect(result.rows[0]?.gradeLabel).toBe("Grade 1");
  });

  it("pages past fifty rows", async () => {
    const admin = { role: "admin" } as const;
    await getDb()
      .insert(child)
      .values(
        Array.from({ length: 60 }, (_, index) => ({
          fullName: `Paged ${String(index).padStart(3, "0")}`,
          stage: "student" as const,
        })),
      );

    const first = await listChildren(admin, { stage: "student", page: 1 });
    const second = await listChildren(admin, { stage: "student", page: 2 });

    expect(first.rows).toHaveLength(50);
    expect(first.hasNext).toBe(true);
    expect(second.rows).toHaveLength(10);
    expect(second.hasNext).toBe(false);
  });
});

describe("getChild", () => {
  it("returns the current enrolment and the primary guardian", async () => {
    const teacher = { role: "teacher" } as const;
    const year = await currentAcademicYear();
    const grade1 = await gradeId("grade_1");
    const [relation] = await getDb()
      .select({ id: lookup.id })
      .from(lookup)
      .where(and(eq(lookup.kind, "relation"), eq(lookup.key, "mother")))
      .limit(1);

    const [created] = await getDb()
      .insert(child)
      .values({ fullName: "Ananya Sharma", stage: "student", consentGivenAt: new Date() })
      .returning({ id: child.id });
    if (!created) throw new Error("insert failed");

    const [parent] = await getDb()
      .insert(guardian)
      .values({ name: "Meera Sharma", phone: "9999999999" })
      .returning({ id: guardian.id });
    if (!parent) throw new Error("insert failed");

    await getDb()
      .insert(childGuardian)
      .values({ childId: created.id, guardianId: parent.id, relationId: relation?.id, isPrimary: true });
    await getDb()
      .insert(enrolment)
      .values({ childId: created.id, academicYear: year, gradeId: grade1 });

    const profile = await getChild(teacher, created.id);
    expect(profile?.fullName).toBe("Ananya Sharma");
    expect(profile?.enrolment).toMatchObject({ academicYear: year, gradeLabel: "Grade 1" });
    expect(profile?.primaryGuardian).toMatchObject({
      name: "Meera Sharma",
      phone: "9999999999",
      relationLabel: "Mother",
    });
  });

  it("returns undefined for an unknown or malformed id", async () => {
    const admin = { role: "admin" } as const;
    expect(await getChild(admin, "00000000-0000-4000-8000-000000000000")).toBeUndefined();
    expect(await getChild(admin, "not-a-uuid")).toBeUndefined();
  });
});
