import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createChild, createLookup, createUser, resetDatabase } from "../../../tests/db/helpers";

import { getDb } from "./client";
import { mutate } from "./mutate";
import { assessment, cycle, entry, lookup } from "./schema";

beforeEach(resetDatabase);

/** The Postgres SQLSTATE for a rejected write, or undefined when it succeeded. */
async function errorCode(run: () => Promise<unknown>): Promise<string | undefined> {
  try {
    await run();
    return undefined;
  } catch (error) {
    const wrapped = error as { code?: string; cause?: { code?: string } };
    return wrapped.code ?? wrapped.cause?.code;
  }
}

describe("cycle", () => {
  it("rejects overlapping cycles and accepts consecutive ones (D8)", async () => {
    const actor = await createUser("coordinator");

    await mutate(actor, (tx) =>
      tx.insert(cycle).values({ startOn: "2026-06-01", endOn: "2026-06-15" }),
    );

    expect(
      await errorCode(() =>
        mutate(actor, (tx) =>
          tx.insert(cycle).values({ startOn: "2026-06-10", endOn: "2026-06-30" }),
        ),
      ),
    ).toBe("23P01");

    await expect(
      mutate(actor, (tx) =>
        tx.insert(cycle).values({ startOn: "2026-06-16", endOn: "2026-06-30" }),
      ),
    ).resolves.toBeDefined();
  });

  it("rejects an end before the start", async () => {
    const actor = await createUser("coordinator");

    expect(
      await errorCode(() =>
        mutate(actor, (tx) => tx.insert(cycle).values({ startOn: "2026-06-15", endOn: "2026-06-01" })),
      ),
    ).toBe("23514");
  });
});

describe("assessment", () => {
  it("requires marks, a grade letter or a remark (D10)", async () => {
    const actor = await createUser("teacher");
    const child = await createChild();

    expect(
      await errorCode(() =>
        mutate(actor, (tx) =>
          tx.insert(assessment).values({ childId: child.id, academicYear: "2026-27" }),
        ),
      ),
    ).toBe("23514");
  });

  it("rejects marks above max_marks", async () => {
    const actor = await createUser("teacher");
    const child = await createChild();

    await expect(
      mutate(actor, (tx) =>
        tx.insert(assessment).values({
          childId: child.id,
          academicYear: "2026-27",
          marks: "80",
          maxMarks: "100",
        }),
      ),
    ).resolves.toBeDefined();

    expect(
      await errorCode(() =>
        mutate(actor, (tx) =>
          tx.insert(assessment).values({
            childId: child.id,
            academicYear: "2026-27",
            marks: "90",
            maxMarks: "80",
          }),
        ),
      ),
    ).toBe("23514");
  });
});

describe("entry", () => {
  it("caps the note at 2000 characters", async () => {
    const actor = await createUser("teacher");
    const child = await createChild();
    const category = await createLookup("entry_category", "observation");
    const base = { childId: child.id, categoryId: category.id, authorId: actor.id };

    await expect(
      mutate(actor, (tx) => tx.insert(entry).values({ ...base, note: "a".repeat(2000) })),
    ).resolves.toBeDefined();

    expect(
      await errorCode(() =>
        mutate(actor, (tx) => tx.insert(entry).values({ ...base, note: "a".repeat(2001) })),
      ),
    ).toBe("23514");
  });
});

describe("row-level security", () => {
  it("returns no rows to the anon role on any table (D25)", async () => {
    await createChild("TEST Hidden");

    // Supabase provides this role; a plain Postgres container does not.
    await getDb().execute(sql`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then
          create role anon nologin;
        end if;
      end $$;
    `);

    const tables = await getDb().execute(
      sql`select tablename from pg_tables where schemaname = 'public' order by tablename`,
    );
    expect(tables.length).toBeGreaterThan(20);

    for (const { tablename } of tables) {
      let count: number | undefined;
      try {
        count = await getDb().transaction(async (tx) => {
          await tx.execute(sql`set local role anon`);
          const rows = await tx.execute(
            sql`select count(*)::int as count from ${sql.identifier(String(tablename))}`,
          );
          return Number(rows[0]?.count ?? 0);
        });
      } catch {
        // A permission error is equally acceptable: either way anon reads nothing.
        continue;
      }
      expect(count, String(tablename)).toBe(0);
    }
  });
});

describe("updated_at", () => {
  it("changes between two updates inside one transaction", async () => {
    const actor = await createUser("admin");
    const [created] = await mutate(actor, (tx) =>
      tx.insert(lookup).values({ kind: "tag", key: "kindness", label: "Kindness" }).returning(),
    );

    // Compared as text: the trigger runs at microsecond resolution, which a
    // JavaScript Date (milliseconds) would round away.
    const [first, second] = await mutate(actor, async (tx) => {
      await tx.update(lookup).set({ label: "Kindness A" }).where(eq(lookup.id, created.id));
      const a = await tx.execute(
        sql`select updated_at::text as at from lookup where id = ${created.id}`,
      );
      await tx.update(lookup).set({ label: "Kindness B" }).where(eq(lookup.id, created.id));
      const b = await tx.execute(
        sql`select updated_at::text as at from lookup where id = ${created.id}`,
      );
      return [String(a[0]?.at), String(b[0]?.at)];
    });

    // `now()` would return the transaction start time and leave these equal;
    // `set_updated_at()` uses `clock_timestamp()` on purpose.
    expect(second > first).toBe(true);
  });
});
