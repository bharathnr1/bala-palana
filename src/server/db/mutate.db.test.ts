import { eq, sql } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { createUser, resetDatabase } from "../../../tests/db/helpers";

import { getDb } from "./client";
import { mutate } from "./mutate";
import { lookup } from "./schema";

beforeEach(resetDatabase);

describe("mutate", () => {
  it("records the actor on the audit row (D26)", async () => {
    const actor = await createUser("coordinator");

    await mutate(actor, (tx) =>
      tx.insert(lookup).values({ kind: "tag", key: "kindness", label: "Kindness" }),
    );

    const rows = await getDb().execute(
      sql`select table_name, op, actor_id from audit_log where table_name = 'lookup' order by id desc limit 1`,
    );

    expect(rows[0]).toMatchObject({ table_name: "lookup", op: "INSERT", actor_id: actor.id });
  });

  it("keeps before and after images on update", async () => {
    const actor = await createUser("admin");
    const [created] = await mutate(actor, (tx) =>
      tx.insert(lookup).values({ kind: "subject", key: "english", label: "English" }).returning(),
    );

    await mutate(actor, (tx) =>
      tx.update(lookup).set({ label: "English A" }).where(eq(lookup.id, created.id)),
    );

    const rows = await getDb().execute(
      sql`select actor_id, before, after from audit_log where table_name = 'lookup' and op = 'UPDATE'`,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actor_id: actor.id });
    expect(rows[0]?.before).toMatchObject({ label: "English" });
    expect(rows[0]?.after).toMatchObject({ label: "English A" });
  });

  it("bumps updated_at on update", async () => {
    const actor = await createUser("admin");
    const [before] = await mutate(actor, (tx) =>
      tx.insert(lookup).values({ kind: "grade", key: "grade_1", label: "Grade 1" }).returning(),
    );

    const [after] = await mutate(actor, (tx) =>
      tx.update(lookup).set({ label: "Class 1" }).where(eq(lookup.id, before.id)).returning(),
    );

    expect(after.updatedAt.getTime()).toBeGreaterThan(before.updatedAt.getTime());
  });

  it("rolls the whole transaction back when the callback throws", async () => {
    const actor = await createUser("admin");

    await expect(
      mutate(actor, async (tx) => {
        await tx.insert(lookup).values({ kind: "term", key: "term_1", label: "Term 1" });
        throw new Error("stop");
      }),
    ).rejects.toThrow("stop");

    const rows = await getDb().execute(sql`select count(*)::int as count from lookup`);
    expect(rows[0]?.count).toBe(0);
  });
});
