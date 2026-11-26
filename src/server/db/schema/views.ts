import { date, integer, pgView, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { entryStatus, visibility } from "./enums";

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

/**
 * The children who need attention and why (M2-06). Only staff-visible entries
 * feed it, because every role reads it and an aggregate cannot be filtered per
 * reader afterwards (D13).
 */
export const vNeedsAttention = pgView("v_needs_attention", {
  childId: uuid("child_id").notNull(),
  openConcerns: integer("open_concerns").notNull(),
  overdueFollowUps: integer("overdue_follow_ups").notNull(),
  concernSubjects: integer("concern_subjects").notNull(),
  daysSinceLastEntry: integer("days_since_last_entry").notNull(),
  lastAuthorId: uuid("last_author_id"),
  reasons: text("reasons").array().notNull(),
}).existing();

/** Open entries with a follow-up date (M2-05); admissions join it in M5. */
export const vOpenFollowUps = pgView("v_open_follow_ups", {
  entryId: uuid("entry_id").notNull(),
  childId: uuid("child_id").notNull(),
  childName: text("child_name").notNull(),
  categoryKey: text("category_key").notNull(),
  categoryLabel: text("category_label").notNull(),
  note: text("note"),
  followUpOn: date("follow_up_on").notNull(),
  status: entryStatus("status").notNull(),
  authorId: uuid("author_id").notNull(),
  authorName: text("author_name").notNull(),
  parentId: uuid("parent_id"),
  visibility: visibility("visibility").notNull(),
}).existing();
