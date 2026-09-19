import { relations, sql } from "drizzle-orm";
import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { transaction } from "./transactions";
import { invoice } from "./invoice";
import { expense } from "./expense";

export const financialAccount = pgTable(
  "financial_account",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    openingBalance: numeric("opening_balance").notNull().default("0"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("financial_account_userId_idx").on(table.userId)],
);

export const financialAccountRelations = relations(financialAccount, ({ one, many }) => ({
  user: one(user, {
    fields: [financialAccount.userId],
    references: [user.id],
  }),
  transactions: many(transaction),
  invoices: many(invoice),
  expenses: many(expense),
}));
