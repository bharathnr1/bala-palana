import { and, eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "../../../tests/db/helpers";
import { getDb } from "@/server/db/client";
import { appUser, child, enrolment, lookup } from "@/server/db/schema";
import { childLookups, currentAcademicYear, getChild } from "@/server/children/queries";

import { activeAdminCount, getPreferences, listLookups } from "./queries";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

describe("activeAdminCount", () => {
  it("counts only active admins", async () => {
    await getDb()
      .insert(appUser)
      .values([
        { name: "One", email: "one@example.com", role: "admin" },
        { name: "Two", email: "two@example.com", role: "admin", active: false },
        { name: "Three", email: "three@example.com", role: "teacher" },
      ]);

    expect(await activeAdminCount()).toBe(1);
  });

  it("is zero when every admin is inactive", async () => {
    await getDb()
      .insert(appUser)
      .values({ name: "One", email: "one@example.com", role: "admin", active: false });

    expect(await activeAdminCount()).toBe(0);
  });
});

describe("getPreferences", () => {
  it("returns the seeded defaults", async () => {
    expect(await getPreferences({ role: "admin" })).toEqual({
      academicYearStartMonth: 6,
      needsAttentionDays: 30,
      audioRetentionDays: 90,
      cycleRule: "half_month",
    });
  });
});

describe("lookup deactivation", () => {
  it("hides a deactivated item from active lists but keeps it on old records", async () => {
    const [grade] = await getDb()
      .select({ id: lookup.id })
      .from(lookup)
      .where(and(eq(lookup.kind, "grade"), eq(lookup.key, "grade_1")))
      .limit(1);
    if (!grade) throw new Error("seed missing grade_1");

    const [created] = await getDb()
      .insert(child)
      .values({ fullName: "Old Record Child", stage: "student" })
      .returning({ id: child.id });
    if (!created) throw new Error("insert failed");

    const year = await currentAcademicYear();
    await getDb()
      .insert(enrolment)
      .values({ childId: created.id, academicYear: year, gradeId: grade.id });

    await getDb().update(lookup).set({ active: false }).where(eq(lookup.id, grade.id));

    const all = await listLookups({ role: "admin" });
    expect(all.find((row) => row.id === grade.id)?.active).toBe(false);

    // Pickers show only active items …
    const { grades } = await childLookups();
    expect(grades.map((row) => row.key)).not.toContain("grade_1");

    // … while an old record still resolves its label.
    const profile = await getChild({ role: "teacher" }, created.id);
    expect(profile?.enrolment?.gradeLabel).toBe("Grade 1");
  });
});
