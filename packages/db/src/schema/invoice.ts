import { relations, sql } from "drizzle-orm";
import {
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";

export const invoiceStatus = pgEnum("invoice_status", [
  "pending",
  "paid",
  "cancelled",
]);

export const invoice = pgTable("invoice", {
  id: uuid("id")
    .default(sql`uuidv7()`)
    .primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  value: integer("value").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  status: invoiceStatus("status").notNull().default("pending"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const invoiceRelations = relations(invoice, ({ one }) => ({
  user: one(user, {
    fields: [invoice.userId],
    references: [user.id],
  }),
}));
