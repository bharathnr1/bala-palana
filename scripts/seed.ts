/**
 * Creates the bootstrap admin's `app_user` row from BOOTSTRAP_ADMIN_EMAIL
 * (02-schema § Seeds, H2). Idempotent: the email is unique. Skipped when the
 * variable is unset, so local and CI runs need nothing extra.
 */
import "dotenv/config";

import { appUser } from "../src/server/db/schema";

import { scriptDb } from "./db";

async function main(): Promise<void> {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  if (!email) {
    console.log("seed:bootstrap — BOOTSTRAP_ADMIN_EMAIL is not set, skipping");
    return;
  }

  const { db, close } = scriptDb();
  try {
    const [created] = await db
      .insert(appUser)
      .values({ email, name: "Bootstrap admin", role: "admin" })
      .onConflictDoNothing({ target: appUser.email })
      .returning({ id: appUser.id });

    console.log(
      created
        ? `seed:bootstrap — created admin ${created.id}`
        : "seed:bootstrap — admin already exists",
    );
  } finally {
    await close();
  }
}

main().catch((error: unknown) => {
  console.error("seed:bootstrap failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
