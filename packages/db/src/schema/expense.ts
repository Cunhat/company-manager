import { relations, sql } from "drizzle-orm";
import { boolean, index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialAccount } from "./account";

export const expense = pgTable(
  "expense",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    title: text("title").notNull(),
    value: numeric("value").notNull(),
    accountId: uuid("account_id").references(() => financialAccount.id, { onDelete: "set null" }),
    iva: boolean("iva").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("expense_accountId_idx").on(table.accountId)],
);

export const expenseRelations = relations(expense, ({ one }) => ({
  account: one(financialAccount, {
    fields: [expense.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [expense.userId],
    references: [user.id],
  }),
}));
