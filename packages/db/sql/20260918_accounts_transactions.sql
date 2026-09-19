-- Standalone upgrade for existing databases; historical records remain unassigned.
-- Safe to rerun. No invoices or expenses are converted into manual transactions.
BEGIN;

CREATE TABLE IF NOT EXISTS "financial_account" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "opening_balance" numeric DEFAULT 0 NOT NULL,
  "user_id" text NOT NULL REFERENCES "user"("id") ON DELETE CASCADE,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);
ALTER TABLE "financial_account" ADD COLUMN IF NOT EXISTS "opening_balance" numeric DEFAULT 0 NOT NULL;
CREATE INDEX IF NOT EXISTS "financial_account_userId_idx" ON "financial_account" ("user_id");

DO $$ BEGIN
  CREATE TYPE "transaction_type" AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "transaction" (
  "id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
  "value" numeric NOT NULL,
  "type" "transaction_type" NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  "user_id" text NOT NULL,
  "account_id" uuid NOT NULL
);

-- Upgrade the initial schema too, if it was applied before this feature.
UPDATE "transaction" AS t SET "user_id" = a."user_id"
FROM "financial_account" AS a WHERE t."account_id" = a."id" AND t."user_id" IS NULL;
ALTER TABLE "transaction" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_user_id_user_id_fk";
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_user_id_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;
ALTER TABLE "transaction" DROP CONSTRAINT IF EXISTS "transaction_account_id_financial_account_id_fk";
ALTER TABLE "transaction" ADD CONSTRAINT "transaction_account_id_financial_account_id_fk"
  FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "transaction_accountId_idx" ON "transaction" ("account_id");

-- Preserve decimal amounts and the existing euro unit used by invoices.
ALTER TABLE "invoice" ALTER COLUMN "value" TYPE numeric USING "value"::numeric;
ALTER TABLE "invoice" ADD COLUMN IF NOT EXISTS "account_id" uuid;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "account_id" uuid;
DO $$ BEGIN
  ALTER TABLE "invoice" ADD CONSTRAINT "invoice_account_id_financial_account_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
DO $$ BEGIN
  ALTER TABLE "expense" ADD CONSTRAINT "expense_account_id_financial_account_id_fk"
    FOREIGN KEY ("account_id") REFERENCES "financial_account"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE INDEX IF NOT EXISTS "invoice_accountId_idx" ON "invoice" ("account_id");
CREATE INDEX IF NOT EXISTS "expense_accountId_idx" ON "expense" ("account_id");

COMMIT;
