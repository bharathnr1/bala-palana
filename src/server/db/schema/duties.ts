import { sql } from "drizzle-orm";
import { check, date, index, integer, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";

import { child } from "./children";
import { cycleStatus, teamRole } from "./enums";
import { lookup } from "./lookup";

/**
 * 15-day duty cycles, 1st–15th and 16th–month end by default (D8). The
 * exclusion constraint that stops overlapping cycles needs raw SQL and is
 * added in the custom migration.
 */
export const cycle = pgTable(
  "cycle",
  {
    id: uuid().primaryKey().defaultRandom(),
    startOn: date().notNull(),
    endOn: date().notNull(),
    status: cycleStatus().notNull().default("planned"),
    note: text(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cycle_dates_check", sql`${table.endOn} >= ${table.startOn}`),
    index("cycle_start_on_idx").on(table.startOn),
  ],
);

/** One team per duty per cycle; label and size are unconstrained (D9). */
export const team = pgTable("team", {
  id: uuid().primaryKey().defaultRandom(),
  cycleId: uuid()
    .notNull()
    .references(() => cycle.id),
  dutyId: uuid().references(() => lookup.id),
  label: text(),
  sort: integer().notNull().default(0),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

/** Membership, with optional from/to dates for mid-cycle swaps (D9). */
export const teamMember = pgTable(
  "team_member",
  {
    id: uuid().primaryKey().defaultRandom(),
    teamId: uuid()
      .notNull()
      .references(() => team.id),
    childId: uuid()
      .notNull()
      .references(() => child.id),
    role: teamRole().notNull().default("member"),
    fromOn: date(),
    toOn: date(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique("team_member_team_child_uq").on(table.teamId, table.childId)],
);
