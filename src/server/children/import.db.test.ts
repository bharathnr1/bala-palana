import { count } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { resetDatabase } from "../../../tests/db/helpers";
import type { ImportRow } from "@/lib/csv";
import { getDb } from "@/server/db/client";
import { appUser, child, enrolment } from "@/server/db/schema";

import { importChildren } from "./import";

beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

async function adminUser() {
  const [row] = await getDb()
    .insert(appUser)
    .values({ name: "TEST admin", email: "admin@example.com", role: "admin" })
    .returning({ id: appUser.id });
  if (!row) throw new Error("insert failed");
  return { id: row.id, role: "admin" as const };
}

async function childCount(): Promise<number> {
  const [row] = await getDb().select({ value: count() }).from(child);
  return row?.value ?? 0;
}

function rows(count: number): ImportRow[] {
  return Array.from({ length: count }, (_, index) => ({
    full_name: `Import Child ${String(index).padStart(3, "0")}`,
    stage: "student" as const,
    dob: "2015-04-12",
    grade: "Grade 3",
    guardian_name: `Guardian ${index}`,
    guardian_phone: "9876543210",
    guardian_relation: "mother",
    consent: "yes" as const,
  }));
}

describe("importChildren", () => {
  it("imports every row in one transaction", async () => {
    const user = await adminUser();
    const summary = await importChildren(user, rows(120));

    expect(summary).toEqual({ imported: 120, skipped: 0, lines: 120 });
    expect(await childCount()).toBe(120);

    const [enrolments] = await getDb().select({ value: count() }).from(enrolment);
    expect(enrolments?.value).toBe(120);
  });

  it("skips children that already exist when the same file is imported again", async () => {
    const user = await adminUser();
    await importChildren(user, rows(20));

    const again = await importChildren(user, rows(20));
    expect(again).toEqual({ imported: 0, skipped: 20, lines: 20 });
    expect(await childCount()).toBe(20);
  });

  it("imports nothing when one row names an unknown grade", async () => {
    const user = await adminUser();
    const batch = rows(5);
    batch[4] = { ...batch[4]!, grade: "Grade 99" };

    await expect(importChildren(user, batch)).rejects.toThrow(/Grade 99/);
    expect(await childCount()).toBe(0);
  });

  it("refuses a user without child.import", async () => {
    const [row] = await getDb()
      .insert(appUser)
      .values({ name: "TEST coordinator", email: "coord@example.com", role: "coordinator" })
      .returning({ id: appUser.id });
    if (!row) throw new Error("insert failed");

    await expect(importChildren({ id: row.id, role: "coordinator" }, rows(1))).rejects.toThrow();
    expect(await childCount()).toBe(0);
  });
});
