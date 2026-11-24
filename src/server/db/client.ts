import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { requireEnv } from "@/lib/env";

import * as schema from "./schema";

function build() {
  const client = postgres(requireEnv("DATABASE_URL"), {
    // Supabase's transaction pooler cannot use prepared statements (01-conventions).
    prepare: false,
    max: 10,
  });
  return drizzle(client, { schema, casing: "snake_case" });
}

export type Db = ReturnType<typeof build>;

const globalForDb = globalThis as unknown as { balaPalanaDb?: Db };

/**
 * The shared client, created on first use rather than on import so that tests
 * and scripts can set the environment before it is read.
 */
export function getDb(): Db {
  globalForDb.balaPalanaDb ??= build();
  return globalForDb.balaPalanaDb;
}
