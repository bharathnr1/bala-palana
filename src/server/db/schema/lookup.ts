import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Every configurable list (D7): admission stages, tags, subjects, duties and
 * so on. Code refers to `key`, never to `label`, which the admin may edit.
 */
export const lookup = pgTable(
  "lookup",
  {
    id: uuid().primaryKey().defaultRandom(),
    kind: text().notNull(),
    key: text().notNull(),
    label: text().notNull(),
    sort: integer().notNull().default(0),
    active: boolean().notNull().default(true),
    meta: jsonb().$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("lookup_kind_key_uq").on(table.kind, table.key),
    index("lookup_kind_active_sort_idx").on(table.kind, table.active, table.sort),
  ],
);
