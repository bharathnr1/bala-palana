import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { userRole } from "./enums";
import { citext } from "./types";

/**
 * Staff accounts (02-schema § Configuration and users). `email` is the invite
 * allowlist; `auth_user_id` is linked on first sign-in (03-auth-and-access).
 */
export const appUser = pgTable("app_user", {
  id: uuid().primaryKey().defaultRandom(),
  authUserId: uuid().unique("app_user_auth_user_id_uq"),
  email: citext().notNull().unique("app_user_email_uq"),
  name: text().notNull(),
  role: userRole().notNull(),
  active: boolean().notNull().default(true),
  lastSeenAt: timestamp({ withTimezone: true }),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
