import { pgView, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { visibility } from "./enums";

/**
 * Views are created by the custom SQL migrations (02-schema § Views and
 * functions); `.existing()` tells Drizzle they are there so the queries stay
 * typed without `db:generate` trying to create them again.
 *
 * The view lists every source of a timeline row; the query applies the
 * visibility filter, which is why the column is exposed (D13).
 */
export const vChildTimeline = pgView("v_child_timeline", {
  childId: uuid("child_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  refTable: text("ref_table").notNull(),
  refId: uuid("ref_id").notNull(),
  visibility: visibility("visibility").notNull(),
  categoryKey: text("category_key"),
}).existing();
