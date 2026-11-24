import { sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { seedDemo } from "../../../scripts/seed-demo";
import { resetDatabase } from "../../../tests/db/helpers";

import { getDb } from "./client";

// Migrations seed the lookups once; truncation removes them, so every test
// starts from the same place: empty tables, defaults re-seeded.
beforeEach(async () => {
  await resetDatabase();
  await getDb().execute(sql`select seed_defaults()`);
});

async function countDefaults(): Promise<{ lookups: number; settings: number }> {
  const rows = await getDb().execute(sql`
    select
      (select count(*)::int from lookup) as lookups,
      (select count(*)::int from setting) as settings
  `);
  return rows[0] as unknown as { lookups: number; settings: number };
}

async function countDemoData() {
  const rows = await getDb().execute(sql`
    select
      (select count(*)::int from app_user) as users,
      (select count(*)::int from child) as children,
      (select count(*)::int from guardian) as guardians,
      (select count(*)::int from enrolment) as enrolments,
      (select count(*)::int from entry) as entries
  `);
  return rows[0] as unknown as {
    users: number;
    children: number;
    guardians: number;
    enrolments: number;
    entries: number;
  };
}

describe("seed_defaults", () => {
  it("is idempotent", async () => {
    const afterFirst = await countDefaults();
    expect(afterFirst.lookups).toBeGreaterThan(80);
    expect(afterFirst.settings).toBe(4);

    await getDb().execute(sql`select seed_defaults()`);
    expect(await countDefaults()).toEqual(afterFirst);
  });
});

describe("seed-demo", () => {
  it("creates one user per role and ~120 children with guardians and enrolments", async () => {
    const summary = await seedDemo();
    expect(summary.skipped).toBe(false);

    const counts = await countDemoData();
    expect(counts.users).toBe(4);
    expect(counts.children).toBe(120);
    expect(counts.guardians).toBeGreaterThan(0);
    expect(counts.enrolments).toBeGreaterThan(0);
    expect(counts.entries).toBeGreaterThan(0);
  });

  it("changes nothing on a second run", async () => {
    await seedDemo();
    const first = await countDemoData();

    const second = await seedDemo();
    expect(second.skipped).toBe(true);
    expect(await countDemoData()).toEqual(first);
  });
});
