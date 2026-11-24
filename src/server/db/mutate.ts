import "server-only";

import { sql } from "drizzle-orm";

import { getDb, type Db } from "./client";

/** Who is acting. `SessionUser` (M0-06) is assignable to it. */
export type Actor = { readonly id: string };

/** The transaction handle handed to a `mutate` callback. */
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/**
 * Runs `fn` in one transaction with the actor recorded on it, so `audit_row()`
 * can write `audit_log.actor_id` (D26). Every write goes through here
 * (01-conventions § Server patterns).
 */
export async function mutate<T>(actor: Actor, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return getDb().transaction(async (tx) => {
    // `true` scopes it to this transaction, so pooled connections never leak
    // one request's actor into another's.
    await tx.execute(sql`select set_config('app.user_id', ${actor.id}, true)`);
    return fn(tx);
  });
}
