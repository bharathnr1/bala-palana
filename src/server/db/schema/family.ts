import { boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { child } from "./children";
import { lookup } from "./lookup";

/** Family members. Siblings share a guardian row (02-schema § Child and family). */
export const guardian = pgTable("guardian", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  phone: text(),
  altPhone: text(),
  email: text(),
  address: text(),
  occupation: text(),
  skills: text(),
  interests: text(),
  sevaInvolvement: text(),
  notes: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const childGuardian = pgTable(
  "child_guardian",
  {
    childId: uuid()
      .notNull()
      .references(() => child.id),
    guardianId: uuid()
      .notNull()
      .references(() => guardian.id),
    relationId: uuid().references(() => lookup.id),
    isPrimary: boolean().notNull().default(false),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.childId, table.guardianId] })],
);
