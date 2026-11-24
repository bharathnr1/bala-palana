/**
 * The command Vercel runs (05-ops § Deploys). Migrations run only in
 * production: previews share the production database, so an unmerged branch
 * must never change its schema (D30).
 */
import { execSync } from "node:child_process";

const isProduction = process.env.VERCEL_ENV === "production";

if (isProduction) {
  console.log("vercel-build: production — applying migrations");
  execSync("pnpm db:migrate", { stdio: "inherit" });
} else {
  console.log(
    `vercel-build: VERCEL_ENV=${process.env.VERCEL_ENV ?? "(unset)"} — skipping migrations`,
  );
}

execSync("pnpm build", { stdio: "inherit" });
