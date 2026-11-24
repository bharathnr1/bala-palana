import { date, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { child } from "./children";
import { admissionEventKind } from "./enums";
import { lookup } from "./lookup";

/** Enquiry → stages → decision; survives conversion to student (D5). */
export const admission = pgTable(
  "admission",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .unique("admission_child_id_uq")
      .references(() => child.id),
    enquiryOn: date().notNull(),
    interviewOn: date(),
    sourceId: uuid().references(() => lookup.id),
    statusId: uuid()
      .notNull()
      .references(() => lookup.id),
    nextAction: text(),
    followUpOn: date(),
    assignedTo: uuid().references(() => appUser.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("admission_status_idx").on(table.statusId),
    index("admission_follow_up_idx").on(table.followUpOn),
  ],
);

/** Stage changes, interviews and notes for one admission (02-schema § Admissions). */
export const admissionEvent = pgTable(
  "admission_event",
  {
    id: uuid().primaryKey().defaultRandom(),
    admissionId: uuid()
      .notNull()
      .references(() => admission.id),
    kind: admissionEventKind().notNull(),
    occurredOn: date().notNull(),
    statusId: uuid().references(() => lookup.id),
    note: text(),
    authorId: uuid().references(() => appUser.id),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("admission_event_admission_idx").on(table.admissionId)],
);
