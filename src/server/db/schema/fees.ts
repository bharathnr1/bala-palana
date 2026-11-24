import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

import { appUser } from "./app-user";
import { child } from "./children";
import { document } from "./documents";
import { lookup } from "./lookup";

/** A due amount in integer paise (D27, D11). */
export const fee = pgTable(
  "fee",
  {
    id: uuid().primaryKey().defaultRandom(),
    childId: uuid()
      .notNull()
      .references(() => child.id),
    academicYear: text().notNull(),
    description: text().notNull(),
    amountDuePaise: bigint({ mode: "number" }).notNull(),
    dueOn: date(),
    createdBy: uuid().references(() => appUser.id),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("fee_amount_due_check", sql`${table.amountDuePaise} >= 0`),
    index("fee_child_idx").on(table.childId),
    index("fee_due_on_idx").on(table.dueOn),
  ],
);

/** One fee can be paid in several instalments. */
export const payment = pgTable(
  "payment",
  {
    id: uuid().primaryKey().defaultRandom(),
    feeId: uuid()
      .notNull()
      .references(() => fee.id),
    amountPaise: bigint({ mode: "number" }).notNull(),
    paidOn: date().notNull(),
    modeId: uuid().references(() => lookup.id),
    reference: text(),
    receiptDocumentId: uuid().references(() => document.id),
    recordedBy: uuid().references(() => appUser.id),
    deletedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("payment_amount_check", sql`${table.amountPaise} > 0`),
    index("payment_fee_idx").on(table.feeId),
  ],
);
