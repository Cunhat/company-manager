import { relations, sql } from "drizzle-orm";
import {
  numeric,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { financialAccount } from "./account";

export const invoiceStatus = pgEnum("invoice_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const ivaStatus = pgEnum("iva_status", ["pending", "paid"]);

export const invoice = pgTable(
  "invoice",
  {
    id: uuid("id")
      .default(sql`uuidv7()`)
      .primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    value: numeric("value", { mode: "number" }).notNull(),
    accountId: uuid("account_id").references(() => financialAccount.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    status: invoiceStatus("status").notNull().default("pending"),
    ivaStatus: ivaStatus("iva_status").notNull().default("pending"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (table) => [index("invoice_accountId_idx").on(table.accountId)],
);

export const invoiceRelations = relations(invoice, ({ one }) => ({
  account: one(financialAccount, {
    fields: [invoice.accountId],
    references: [financialAccount.id],
  }),
  user: one(user, {
    fields: [invoice.userId],
    references: [user.id],
  }),
}));
