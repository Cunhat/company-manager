import { sql } from "drizzle-orm";
import {
  check,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Payment IDs survive ordinary transaction/account deletion and are cleared on reopening.
// The confirmed government amount belongs to the quarter, not to the bank ledger.
export const ivaQuarter = pgTable(
  "iva_quarter",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    quarter: integer("quarter").notNull(),
    status: text("status").notNull().default("open"),
    governmentCents: numeric("government_cents", { precision: 16, scale: 0, mode: "number" }),
    salesCents: numeric("sales_cents", { precision: 16, scale: 0, mode: "number" }),
    deductionsCents: numeric("deductions_cents", { precision: 16, scale: 0, mode: "number" }),
    carryInCents: numeric("carry_in_cents", { precision: 16, scale: 0, mode: "number" }),
    carryOutCents: numeric("carry_out_cents", { precision: 16, scale: 0, mode: "number" }),
    paymentTransactionId: uuid("payment_transaction_id"),
    closedAt: timestamp("closed_at"),
    reopenedAt: timestamp("reopened_at"),
  },
  (t) => [
    unique("iva_quarter_user_period_unique").on(t.userId, t.year, t.quarter),
    check("iva_quarter_valid_quarter", sql`${t.quarter} between 1 and 4`),
    check("iva_quarter_valid_status", sql`${t.status} in ('open', 'closed')`),
  ],
);
