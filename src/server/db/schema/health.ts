import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { child } from "./children";

/**
 * One row per child. `medical_alerts` is always returned to staff; the other
 * fields only with `restricted.read` (D13).
 */
export const healthProfile = pgTable("health_profile", {
  childId: uuid()
    .primaryKey()
    .references(() => child.id),
  bloodGroup: text(),
  allergies: text(),
  conditions: text(),
  medicalAlerts: text(),
  emergencyNotes: text(),
  updatedBy: uuid().references(() => appUser.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
