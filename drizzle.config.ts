import "dotenv/config";
import { defineConfig } from "drizzle-kit";

/**
 * drizzle-kit runs outside the app (CLI, the Vercel build), so it uses
 * DIRECT_URL — the session pooler — never the transaction pooler the app
 * queries through (05-ops § Environment variables).
 *
 * `casing: 'snake_case'` keeps SQL names conventional while the TypeScript
 * stays camelCase (01-conventions § Data conventions).
 */
const url = process.env.DIRECT_URL;

if (!url) {
  throw new Error("DIRECT_URL is not set; see 05-ops § Environment variables");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/db/schema",
  out: "./drizzle",
  casing: "snake_case",
  dbCredentials: { url },
  strict: true,
  verbose: true,
});
