import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

/**
 * Runs once before the `db` project (06-testing § Layers): validates the
 * environment and applies every migration to DATABASE_URL, so the suite never
 * tests a database that is out of date.
 */
export default async function setup(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is required for database tests (README § Development)");
  }

  // The modules under test import env.ts, which validates the public Supabase
  // variables at startup. These dummies satisfy it; nothing connects to Supabase.
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

  const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  } finally {
    await client.end();
  }
}
