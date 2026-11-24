import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUser } from "./app-user";

/** Key–value settings such as `academic_year_start_month` (02-schema § Seeds). */
export const setting = pgTable("setting", {
  key: text().primaryKey(),
  value: jsonb().$type<unknown>().notNull(),
  updatedBy: uuid().references(() => appUser.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
