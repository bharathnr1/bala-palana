import { sql } from "drizzle-orm";
import {
  check,
  date,
  foreignKey,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { child } from "./children";
import { entryStatus, visibility } from "./enums";
import { lookup } from "./lookup";

/** The backbone (D6): observations, concerns, actions, health notes, all in one table. */
export const entry = pgTable(
  "entry",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .references(() => child.id),
    categoryId: uuid()
      .notNull()
      .references(() => lookup.id),
    note: text(),
    details: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    subjectId: uuid().references(() => lookup.id),
    occurredAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    authorId: uuid()
      .notNull()
      .references(() => appUser.id),
    visibility: visibility().notNull().default("staff"),
    followUpOn: date(),
    status: entryStatus(),
    closedAt: timestamp({ withTimezone: true }),
    closedBy: uuid().references(() => appUser.id),
    parentId: uuid(),
    groupKey: uuid(),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "entry_note_length_check",
      sql`${table.note} is null or char_length(${table.note}) <= 2000`,
    ),
    // A follow-up / corrective action points at the entry it belongs to.
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "entry_parent_id_entry_id_fk",
    }),
    index("entry_child_occurred_idx")
      .on(table.childId, table.occurredAt.desc())
      .where(sql`deleted_at is null`),
    index("entry_open_follow_up_idx")
      .on(table.status, table.followUpOn)
      .where(sql`status = 'open'`),
    index("entry_author_idx").on(table.authorId),
    index("entry_category_idx").on(table.categoryId),
    index("entry_parent_idx").on(table.parentId),
  ],
);

export const entryTag = pgTable(
  "entry_tag",
  {
    entryId: uuid()
      .notNull()
      .references(() => entry.id),
    tagId: uuid()
      .notNull()
      .references(() => lookup.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.entryId, table.tagId] })],
);
