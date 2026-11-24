import { sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { appUser, child, lookup } from "@/server/db/schema";

export type TestRole = "admin" | "management" | "coordinator" | "teacher";

/**
 * Empties every table between tests. Mutations need their own transaction
 * (that is how `mutate` records the actor), so a wrapping rollback is not
 * possible; the `db` project runs its files serially, which makes truncation
 * deterministic (06-testing § Layers).
 */
export async function resetDatabase(): Promise<void> {
  await getDb().execute(sql`
    do $$
    declare
      targets text;
    begin
      select string_agg(format('public.%I', tablename), ', ')
        into targets
        from pg_tables
       where schemaname = 'public';
      if targets is not null then
        execute 'truncate table ' || targets || ' restart identity cascade';
      end if;
    end
    $$;
  `);
}

/** A child row for tests that need one. Not the behaviour under test. */
export async function createChild(fullName: string = "TEST Child"): Promise<{ id: string }> {
  const [row] = await getDb().insert(child).values({ fullName }).returning({ id: child.id });
  return row;
}

/** A lookup row of the given kind. */
export async function createLookup(kind: string, key: string): Promise<{ id: string }> {
  const [row] = await getDb()
    .insert(lookup)
    .values({ kind, key, label: key })
    .returning({ id: lookup.id });
  return row;
}

/** A staff account for the test that needs an actor. Not the behaviour under test. */
export async function createUser(
  role: TestRole = "teacher",
  email: string = `${role}@example.com`,
): Promise<{ id: string }> {
  const [user] = await getDb()
    .insert(appUser)
    .values({ email, name: `TEST ${role}`, role })
    .returning({ id: appUser.id });

  return user;
}
