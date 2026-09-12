-- Add the per diem feature to an existing database after 20260909_kms_journeys.sql.
-- Allowance snapshots survive deletion of the source mileage journey.
BEGIN;

CREATE TABLE "per_diem" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "source_journey_id" uuid REFERENCES "journey"("id") ON DELETE SET NULL,
  "date" date NOT NULL,
  "destination" text NOT NULL,
  "reason" text NOT NULL,
  "type" text NOT NULL,
  "territory" text NOT NULL,
  "daily_rate_cents" integer NOT NULL,
  "percentage" integer NOT NULL,
  "source_origin" text NOT NULL,
  "source_distance" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "per_diem_percentage_check" CHECK ("percentage" BETWEEN 0 AND 100),
  CONSTRAINT "per_diem_rate_check" CHECK ("daily_rate_cents" BETWEEN 1 AND 1000000),
  CONSTRAINT "per_diem_distance_check" CHECK ("source_distance" > 0),
  CONSTRAINT "per_diem_type_check" CHECK ("type" IN ('daily', 'departure', 'intermediate', 'return')),
  CONSTRAINT "per_diem_territory_check" CHECK ("territory" IN ('portugal', 'abroad'))
);
CREATE UNIQUE INDEX "per_diem_user_date_unique" ON "per_diem" ("user_id", "date");

COMMIT;
