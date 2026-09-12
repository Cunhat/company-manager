import { boolean, integer, pgTable, uuid, text, timestamp } from "drizzle-orm/pg-core";
import { user } from "./auth";
import { relations } from "drizzle-orm";

export const journey = pgTable("journey", {
  id: uuid("id").primaryKey().defaultRandom(),
  origin: text("origin").notNull(),
  destination: text("destination").notNull(),
  reason: text("reason").notNull(),
  // Null identifies legacy journeys whose direction was not recorded.
  isReturn: boolean("is_return"),
  distance: integer("distance").notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),

  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const journeyRelations = relations(journey, ({ one }) => ({
  user: one(user, {
    fields: [journey.userId],
    references: [user.id],
  }),
}));
