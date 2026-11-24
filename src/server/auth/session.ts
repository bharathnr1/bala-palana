import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { env } from "@/lib/env";
import type { Role } from "@/lib/permissions";
import { TEST_USER_COOKIE } from "@/lib/test-auth";
import { getDb } from "@/server/db/client";
import { appUser } from "@/server/db/schema";
import { mutate } from "@/server/db/mutate";

import { checkInvite } from "./invite";
import { createSupabaseServerClient } from "./supabase";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

type AppUserRow = typeof appUser.$inferSelect;

function toSessionUser(row: AppUserRow): SessionUser {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

async function findByEmail(email: string): Promise<AppUserRow | undefined> {
  const [row] = await getDb().select().from(appUser).where(eq(appUser.email, email)).limit(1);
  return row;
}

/** Marks her as seen at most once an hour, so page views don't flood the audit log. */
async function touchLastSeen(row: AppUserRow): Promise<void> {
  await mutate(row, (tx) =>
    tx
      .update(appUser)
      .set({ lastSeenAt: new Date() })
      .where(
        and(
          eq(appUser.id, row.id),
          sql`(${appUser.lastSeenAt} is null or ${appUser.lastSeenAt} < now() - interval '1 hour')`,
        ),
      ),
  );
}

async function testModeUser(): Promise<SessionUser> {
  const store = await cookies();
  const id = store.get(TEST_USER_COOKIE)?.value;
  if (!id) redirect("/login");

  const [row] = await getDb().select().from(appUser).where(eq(appUser.id, id)).limit(1);
  if (!row || !row.active) {
    // A Server Component cannot delete cookies; this handler can.
    redirect("/auth/clear?reason=inactive");
  }

  return toSessionUser(row);
}

/**
 * The signed-in user, or a redirect to `/login` (03-auth-and-access
 * § Sign-in). Memoised per request, so a page can call it in several places.
 *
 * The allowlist and the `active` flag are re-checked on every request: a user
 * who is deactivated mid-session is signed out on her next request.
 */
export const requireUser = cache(async (): Promise<SessionUser> => {
  if (env().AUTH_MODE === "test") return testModeUser();

  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) redirect("/login");

  const row = await findByEmail(authUser.email);
  if (!row) {
    await supabase.auth.signOut();
    redirect("/login?error=not_invited");
  }

  const outcome = checkInvite(row);
  if (!outcome.ok) {
    await supabase.auth.signOut();
    redirect(`/login?error=${outcome.reason}`);
  }

  if (!row.authUserId) {
    await mutate(row, (tx) =>
      tx.update(appUser).set({ authUserId: authUser.id }).where(eq(appUser.id, row.id)),
    );
  }

  await touchLastSeen(row);

  return toSessionUser(row);
});
