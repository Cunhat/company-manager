import { integer, pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { relations } from "drizzle-orm";

export const kmsPath = pgTable("kms_path", {
  id: uuid("id").primaryKey().defaultRandom(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  reason: text("reason").notNull(),
  distance: integer("distance").notNull(),
  date: timestamp("date").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const kmsPathRelations = relations(kmsPath, ({ one }) => ({
  user: one(user, {
    fields: [kmsPath.userId],
    references: [user.id],
  }),
}));
