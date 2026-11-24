import { sql } from "drizzle-orm";
import { bigserial, check, index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/**
 * Append-only record of every write (D26). The `audit_row()` trigger fills it;
 * nothing else may insert. `actor_id` comes from `app.user_id`, which
 * `mutate()` sets for the transaction.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial({ mode: "number" }).primaryKey(),
    at: timestamp({ withTimezone: true }).notNull().defaultNow(),
    actorId: uuid(),
    tableName: text().notNull(),
    rowId: text().notNull(),
    op: text().notNull(),
    before: jsonb().$type<Record<string, unknown>>(),
    after: jsonb().$type<Record<string, unknown>>(),
  },
  (table) => [
    check("audit_log_op_check", sql`${table.op} in ('INSERT', 'UPDATE', 'DELETE')`),
    index("audit_log_table_row_idx").on(table.tableName, table.rowId),
    index("audit_log_at_idx").on(table.at),
  ],
);
