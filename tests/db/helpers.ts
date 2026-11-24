import { sql } from "drizzle-orm";

import { getDb } from "@/server/db/client";
import { appUser } from "@/server/db/schema";

export type TestRole = "admin" | "management" | "coordinator" | "teacher";

/**
 * Empties every table between tests. Mutations need their own transaction
 * (that is how `mutate` records the actor), so a wrapping rollback is not
 * possible; the `db` project runs its files serially, which makes truncation
 * deterministic (06-testing § Layers).
 */
export async function resetDatabase(): Promise<void> {
  await getDb().execute(
    sql`truncate table audit_log, setting, lookup, app_user restart identity cascade`,
  );
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
