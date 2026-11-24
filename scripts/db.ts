import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../src/server/db/schema";

/**
 * A client for scripts (seeds, jobs). Same schema and casing as the app, but
 * it reads DATABASE_URL directly instead of the app's validated environment,
 * so a script runs with one variable set.
 */
export function scriptDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set (README § Development)");

  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  return {
    db: drizzle(client, { schema, casing: "snake_case" }),
    close: () => client.end(),
  };
}
