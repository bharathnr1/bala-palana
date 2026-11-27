import { date, integer, numeric, pgView, text, timestamp, uuid } from "drizzle-orm/pg-core";

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

/** Cycles served per child, duty and academic year (M3-02, read by M3-05). */
export const vDutyCounts = pgView("v_duty_counts", {
  childId: uuid("child_id").notNull(),
  dutyId: uuid("duty_id").notNull(),
  academicYear: text("academic_year").notNull(),
  cyclesServed: integer("cycles_served").notNull(),
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

/**
 * Per-subject assessment averages by class and term (M4-04). Labels, not ids,
 * because the report is read as text and filtered by what it shows.
 */
export const vGradeSubjectSummary = pgView("v_grade_subject_summary", {
  academicYear: text("academic_year").notNull(),
  grade: text("grade").notNull(),
  term: text("term").notNull(),
  subject: text("subject").notNull(),
  avgPct: numeric("avg_pct", { precision: 5, scale: 1 }).notNull(),
  n: integer("n").notNull(),
}).existing();

/**
 * Open follow-ups (M2-05): entries that are still open, plus admissions with a
 * follow-up date (M5-01). `entry_id` and `admission_id` say which kind a row is;
 * the owner is the entry's author or the admission's assignee.
 */
export const vOpenFollowUps = pgView("v_open_follow_ups", {
  entryId: uuid("entry_id"),
  childId: uuid("child_id").notNull(),
  childName: text("child_name").notNull(),
  categoryKey: text("category_key").notNull(),
  categoryLabel: text("category_label").notNull(),
  note: text("note"),
  followUpOn: date("follow_up_on").notNull(),
  status: entryStatus("status").notNull(),
  authorId: uuid("author_id"),
  authorName: text("author_name"),
  parentId: uuid("parent_id"),
  visibility: visibility("visibility").notNull(),
  admissionId: uuid("admission_id"),
}).existing();

/** Admissions per stage, with the follow-ups due today or earlier (M5-01). */
export const vAdmissionsFunnel = pgView("v_admissions_funnel", {
  status: text("status").notNull(),
  count: integer("count").notNull(),
  followUpsDue: integer("follow_ups_due").notNull(),
  // The stage order the board renders in; not shown.
  sort: integer("sort").notNull(),
}).existing();
