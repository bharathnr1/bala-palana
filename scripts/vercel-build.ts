/**
 * The command Vercel runs (05-ops § Deploys). Migrations run only in
 * production: previews share the production database, so an unmerged branch
 * must never change its schema (D30).
 */
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";

const isProduction = process.env.VERCEL_ENV === "production";

// The schema and its config land in M0-03, the connection string in H5.
// Until both exist, migrate would only fail the deploy.
const hasDrizzleConfig = ["drizzle.config.ts", "drizzle.config.js", "drizzle.config.json"].some(
  (path) => existsSync(path),
);
const canMigrate = hasDrizzleConfig && Boolean(process.env.DIRECT_URL);

if (isProduction && canMigrate) {
  console.log("vercel-build: production — applying migrations");
  execSync("pnpm db:migrate", { stdio: "inherit" });

  // The bootstrap admin comes from BOOTSTRAP_ADMIN_EMAIL; the seed is a no-op
  // when the row already exists or the variable is unset (02-schema § Seeds).
  console.log("vercel-build: production — ensuring the bootstrap admin");
  execSync("pnpm seed:bootstrap", { stdio: "inherit" });
} else if (isProduction) {
  console.log("vercel-build: production — no drizzle config or DIRECT_URL, skipping migrations");
} else {
  console.log(
    `vercel-build: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"} — skipping migrations`,
  );
}

execSync("pnpm build", { stdio: "inherit" });
