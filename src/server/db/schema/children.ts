import { sql } from "drizzle-orm";
import {
  check,
  date,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

import { childStage } from "./enums";

/**
 * One record for life: applicant → student → alumna (D5). Admission history
 * stays attached when she joins.
 *
 * `photo_document_id` is a plain uuid here: `child` and `document` reference
 * each other, and a TypeScript import cycle would break inference. The
 * foreign key is added by the custom migration after both tables exist.
 */
export const child = pgTable(
  "child",
  {
    id: uuid().primaryKey().defaultRandom(),
    fullName: text().notNull(),
    preferredName: text(),
    dob: date(),
    photoDocumentId: uuid(),
    stage: childStage().notNull().default("applicant"),
    joinedOn: date(),
    leftOn: date(),
    leftReason: text(),
    ownPhone: text(),
    ownEmail: text(),
    consentGivenAt: timestamp({ withTimezone: true }),
    notes: text(),
    anonymisedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    // Trigram index for the name search in M0-08 (02-schema § Child).
    index("child_full_name_trgm_idx").using("gin", table.fullName.op("gin_trgm_ops")),
    index("child_stage_idx").on(table.stage),
  ],
);

/** Grade per academic year, plus the outside school she attends. */
export const enrolment = pgTable(
  "enrolment",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .references(() => child.id),
    academicYear: text().notNull(),
    gradeId: uuid(),
    groupId: uuid(),
    outsideSchool: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("enrolment_child_year_uq").on(table.childId, table.academicYear),
    check("enrolment_academic_year_check", sql`${table.academicYear} ~ '^\\d{4}-\\d{2}$'`),
  ],
);

/** Schools she attended before the gurukula. */
export const educationHistory = pgTable("education_history", {
  id: uuid().primaryKey().defaultRandom(),
  childId: uuid()
    .notNull()
    .references(() => child.id),
  school: text().notNull(),
  fromYear: integer(),
  toYear: integer(),
  gradeReached: text(),
  note: text(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
