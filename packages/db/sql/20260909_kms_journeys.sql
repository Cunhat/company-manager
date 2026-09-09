-- Upgrade an existing database that used kms_path.date for path creation.
-- Run once against that database before deploying the journey endpoints.
BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'kms_path' AND column_name = 'date'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'kms_path' AND column_name = 'created_at'
    ) THEN
      RAISE EXCEPTION 'kms_path has both date and created_at; reconcile these columns before upgrading';
    END IF;
    ALTER TABLE "kms_path" RENAME COLUMN "date" TO "created_at";
  END IF;
END $$;

ALTER TABLE "kms_path"
  ADD COLUMN IF NOT EXISTS "created_at" timestamp DEFAULT now() NOT NULL;
ALTER TABLE "kms_path"
  ALTER COLUMN "created_at" SET DEFAULT now(),
  ALTER COLUMN "created_at" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "journey" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "origin" text NOT NULL,
  "destination" text NOT NULL,
  "reason" text NOT NULL,
  "distance" integer NOT NULL,
  "description" text,
  "date" timestamp NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE
);

COMMIT;
