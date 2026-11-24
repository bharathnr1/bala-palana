import { sql } from "drizzle-orm";
import {
  check,
  index,
  numeric,
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
 * Marks, grade letters or remarks — any combination (D10). One row per child,
 * year, term and subject.
 */
export const assessment = pgTable(
  "assessment",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .references(() => child.id),
    academicYear: text().notNull(),
    gradeId: uuid().references(() => lookup.id),
    termId: uuid().references(() => lookup.id),
    subjectId: uuid().references(() => lookup.id),
    marks: numeric({ precision: 6, scale: 2 }),
    maxMarks: numeric({ precision: 6, scale: 2 }),
    gradeLetter: text(),
    remark: text(),
    recordedBy: uuid().references(() => appUser.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("assessment_child_year_term_subject_uq").on(
      table.childId,
      table.academicYear,
      table.termId,
      table.subjectId,
    ),
    check(
      "assessment_value_check",
      sql`${table.marks} is not null or ${table.gradeLetter} is not null or ${table.remark} is not null`,
    ),
    check(
      "assessment_marks_check",
      sql`${table.maxMarks} is null or ${table.marks} is null or ${table.marks} <= ${table.maxMarks}`,
    ),
    index("assessment_child_year_idx").on(table.childId, table.academicYear),
  ],
);
