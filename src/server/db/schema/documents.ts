import {
  boolean,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { child } from "./children";
import { lookup } from "./lookup";

/**
 * Documents live in the private `child-files` bucket; this row is the metadata
 * and the signed-URL key (D16). `restricted` defaults from the kind's
 * `meta.restricted` in code (02-schema § Files).
 */
export const document = pgTable(
  "document",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid().references(() => child.id),
    kindId: uuid().references(() => lookup.id),
    title: text(),
    filePath: text().notNull(),
    mime: text(),
    sizeBytes: integer(),
    issuedOn: date(),
    restricted: boolean().notNull().default(false),
    uploadedBy: uuid().references(() => appUser.id),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("document_file_path_uq").on(table.filePath)],
);
