import { relations, sql } from "drizzle-orm";
import {
  check,
  date,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { user } from "./auth";
import { journey } from "./journeys";

// Store the reviewed allowance, rather than recalculating historical payments from current rates.
export const perDiem = pgTable(
  "per_diem",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceJourneyId: uuid("source_journey_id").references(() => journey.id, {
      onDelete: "set null",
    }),
    date: date("date", { mode: "string" }).notNull(),
    destination: text("destination").notNull(),
    reason: text("reason").notNull(),
    type: text("type", {
      enum: ["daily", "departure", "intermediate", "return"],
    }).notNull(),
    territory: text("territory", { enum: ["portugal", "abroad"] }).notNull(),
    dailyRateCents: integer("daily_rate_cents").notNull(),
    percentage: integer("percentage").notNull(),
    sourceOrigin: text("source_origin").notNull(),
    sourceDistance: integer("source_distance").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("per_diem_user_date_unique").on(table.userId, table.date),
    check("per_diem_percentage_check", sql`${table.percentage} BETWEEN 0 AND 100`),
    check("per_diem_rate_check", sql`${table.dailyRateCents} BETWEEN 1 AND 1000000`),
    check("per_diem_distance_check", sql`${table.sourceDistance} > 0`),
    check(
      "per_diem_type_check",
      sql`${table.type} IN ('daily', 'departure', 'intermediate', 'return')`,
    ),
    check("per_diem_territory_check", sql`${table.territory} IN ('portugal', 'abroad')`),
  ],
);

export const perDiemRelations = relations(perDiem, ({ one }) => ({
  user: one(user, { fields: [perDiem.userId], references: [user.id] }),
  sourceJourney: one(journey, {
    fields: [perDiem.sourceJourneyId],
    references: [journey.id],
  }),
}));
