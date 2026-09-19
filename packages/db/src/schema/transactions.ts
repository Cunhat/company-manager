import { relations, sql } from "drizzle-orm";
import { index, numeric, pgEnum, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialAccount } from "./account";

export const transactionType = pgEnum("transaction_type", ["income", "expense"]);

export const transaction = pgTable(
  "transaction",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    value: numeric("value").notNull(),
    type: transactionType("type").notNull(),
    description: text("description"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),

    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => financialAccount.id, { onDelete: "cascade" }),
  },
  (table) => [index("transaction_accountId_idx").on(table.accountId)],
);

export const transactionRelations = relations(transaction, ({ one }) => ({
  account: one(financialAccount, {
    fields: [transaction.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [transaction.userId],
    references: [user.id],
  }),
}));
