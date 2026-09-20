import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialAccount } from "./account";
import { expense } from "./expense";
import { transaction } from "./transactions";

const salaryFields = () => ({
  grossCents: integer("gross_cents").notNull(),
  mealCents: integer("meal_cents").notNull().default(13000),
  ssRate: integer("ss_rate").notNull().default(1100),
  tsuRate: integer("tsu_rate").notNull().default(2375),
  irsRate: integer("irs_rate").notNull().default(1303),
});

// Money uses cents; percentages use basis points, so 23.75% is stored as 2375.
export const salarySettings = pgTable(
  "salary_settings",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => user.id, { onDelete: "cascade" }),
    ...salaryFields(),
    accountId: uuid("account_id").references(() => financialAccount.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    check(
      "salary_settings_amounts",
      sql`${t.grossCents} between 1 and 100000000 and ${t.mealCents} between 0 and 100000000`,
    ),
    check(
      "salary_settings_rates",
      sql`${t.ssRate} between 0 and 10000 and ${t.tsuRate} between 0 and 10000 and ${t.irsRate} between 0 and 10000 and ${t.ssRate} + ${t.irsRate} <= 10000`,
    ),
  ],
);

export const payrollRecord = pgTable(
  "payroll_record",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    month: text("month").notNull(),
    kind: text("kind", { enum: ["monthly", "holiday", "christmas"] }).notNull(),
    ...salaryFields(),
    irsOverrideCents: integer("irs_override_cents"),
    perDiemCents: integer("per_diem_cents").notNull().default(0),
    mileageCents: integer("mileage_cents").notNull().default(0),
    kilometres: integer("kilometres").notNull().default(0),
    perDiemDays: integer("per_diem_days").notNull().default(0),
    ssCents: integer("ss_cents").notNull(),
    tsuCents: integer("tsu_cents").notNull(),
    irsCents: integer("irs_cents").notNull(),
    netCents: integer("net_cents").notNull(),
    companyCents: integer("company_cents").notNull(),
    revision: integer("revision").notNull().default(1),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("payroll_record_user_month_idx").on(t.userId, t.month),
    uniqueIndex("payroll_record_month_unique")
      .on(t.userId, t.month)
      .where(sql`${t.kind} = 'monthly'`),
    uniqueIndex("payroll_record_bonus_unique")
      .on(t.userId, t.kind, sql`left(${t.month}, 4)`)
      .where(sql`${t.kind} <> 'monthly'`),
    check("payroll_record_month_check", sql`${t.month} ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'`),
    check("payroll_record_kind_check", sql`${t.kind} in ('monthly', 'holiday', 'christmas')`),
    check(
      "payroll_record_amounts",
      sql`${t.grossCents} between 1 and 100000000 and ${t.mealCents} between 0 and 100000000 and ${t.netCents} >= 0 and ${t.irsCents} >= 0 and ${t.ssCents} + ${t.irsCents} <= ${t.grossCents}`,
    ),
    check(
      "payroll_record_rates",
      sql`${t.ssRate} between 0 and 10000 and ${t.tsuRate} between 0 and 10000 and ${t.irsRate} between 0 and 10000 and ${t.ssRate} + ${t.irsRate} <= 10000`,
    ),
  ],
);

// Salary transfers link to expenses; tax payments link to expense transactions.
export const payrollPayment = pgTable(
  "payroll_payment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recordId: uuid("record_id")
      .notNull()
      .references(() => payrollRecord.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["salary", "ss", "irs"] }).notNull(),
    expenseId: uuid("expense_id").references(() => expense.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id").references(() => transaction.id, { onDelete: "cascade" }),
  },
  (t) => [
    uniqueIndex("payroll_payment_record_kind_unique").on(t.recordId, t.kind),
    uniqueIndex("payroll_payment_expense_unique").on(t.expenseId),
    uniqueIndex("payroll_payment_transaction_unique").on(t.transactionId),
    check("payroll_payment_kind_check", sql`${t.kind} in ('salary', 'ss', 'irs')`),
    check(
      "payroll_payment_ledger_check",
      sql`(${t.kind} = 'salary' and ${t.expenseId} is not null and ${t.transactionId} is null) or (${t.kind} in ('ss', 'irs') and ${t.expenseId} is null and ${t.transactionId} is not null)`,
    ),
  ],
);
