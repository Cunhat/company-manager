-- Salary tax payments are cash expense transactions, not supplier expenses.
-- Convert only linked SS/IRS payments, preserving amounts, accounts and dates.
BEGIN;
LOCK TABLE payroll_payment, expense, "transaction" IN ACCESS EXCLUSIVE MODE;
ALTER TABLE payroll_payment ALTER COLUMN expense_id DROP NOT NULL;
ALTER TABLE payroll_payment ADD COLUMN IF NOT EXISTS transaction_id uuid;
DO $$ BEGIN
  ALTER TABLE payroll_payment ADD CONSTRAINT payroll_payment_transaction_id_transaction_id_fk
    FOREIGN KEY (transaction_id) REFERENCES "transaction"(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS payroll_payment_transaction_unique ON payroll_payment(transaction_id);

-- These are non-IVA payroll rows. Reclassification leaves IVA amounts unchanged,
-- including in a closed quarter. The exclusive table lock isolates this migration;
-- the IVA guard is restored before commit and also restored on rollback.
ALTER TABLE expense DISABLE TRIGGER expense_iva_guard;
DO $$
DECLARE old_payment record; new_transaction uuid;
BEGIN
  FOR old_payment IN SELECT p.id AS payment_id, e.* FROM payroll_payment p
    JOIN expense e ON e.id = p.expense_id JOIN payroll_record r ON r.id = p.record_id
    WHERE p.kind IN ('ss', 'irs') AND p.transaction_id IS NULL
  LOOP
    IF old_payment.iva IS DISTINCT FROM false THEN RAISE EXCEPTION 'A payroll tax expense has IVA. Resolve it before reclassifying payments.'; END IF;
    IF NOT EXISTS (SELECT 1 FROM financial_account WHERE id = old_payment.account_id AND user_id = old_payment.user_id) THEN
      RAISE EXCEPTION 'A payroll tax expense has no owned account. Correct its payment account before reclassifying payments.';
    END IF;
    INSERT INTO "transaction"(user_id, account_id, type, description, value, created_at, updated_at)
      VALUES(old_payment.user_id, old_payment.account_id, 'expense', old_payment.title, old_payment.value, old_payment.created_at, old_payment.updated_at)
      RETURNING id INTO new_transaction;
    UPDATE payroll_payment SET transaction_id = new_transaction, expense_id = NULL WHERE id = old_payment.payment_id;
    DELETE FROM expense WHERE id = old_payment.id;
  END LOOP;
END $$;
ALTER TABLE expense ENABLE TRIGGER expense_iva_guard;
DO $$ BEGIN
  ALTER TABLE payroll_payment ADD CONSTRAINT payroll_payment_ledger_check CHECK (
    (kind = 'salary' AND expense_id IS NOT NULL AND transaction_id IS NULL) OR
    (kind IN ('ss', 'irs') AND expense_id IS NULL AND transaction_id IS NOT NULL)
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION payroll_sync_expenses() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE expense e SET value = NEW.net_cents / 100.0, updated_at = now()
    FROM payroll_payment p WHERE p.record_id = NEW.id AND p.kind = 'salary' AND p.expense_id = e.id
    AND e.value IS DISTINCT FROM NEW.net_cents / 100.0;
  UPDATE "transaction" t SET value = CASE p.kind WHEN 'ss' THEN NEW.ss_cents + NEW.tsu_cents ELSE NEW.irs_cents END / 100.0,
    updated_at = now()
    FROM payroll_payment p WHERE p.record_id = NEW.id AND p.transaction_id = t.id
    AND t.value IS DISTINCT FROM CASE p.kind WHEN 'ss' THEN NEW.ss_cents + NEW.tsu_cents ELSE NEW.irs_cents END / 100.0;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION payroll_guard_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Preserve existing account/user deletion cascades.
  IF TG_OP = 'DELETE' AND (NOT EXISTS (SELECT 1 FROM "user" WHERE id = OLD.user_id)
    OR NOT EXISTS (SELECT 1 FROM financial_account WHERE id = OLD.account_id)) THEN RETURN OLD; END IF;
  IF pg_trigger_depth() = 1 AND EXISTS (SELECT 1 FROM payroll_payment WHERE transaction_id = OLD.id) THEN
    RAISE EXCEPTION 'This transaction is linked to payroll. Edit its payment on the Salary page.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS transaction_payroll_guard ON "transaction";
CREATE TRIGGER transaction_payroll_guard BEFORE UPDATE OR DELETE ON "transaction" FOR EACH ROW EXECUTE FUNCTION payroll_guard_transaction();

CREATE OR REPLACE FUNCTION payroll_pay(p_user text, p_id uuid, p_kind text, p_date date, p_account uuid, p_revision integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r payroll_record; amount integer; linked_id uuid; label text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  SELECT * INTO r FROM payroll_record WHERE id = p_id AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll record not found'; END IF;
  IF EXISTS (SELECT 1 FROM payroll_payment WHERE record_id = p_id AND kind = p_kind) THEN RETURN; END IF;
  IF r.revision <> p_revision THEN RAISE EXCEPTION 'Payroll changed or is unavailable. Refresh before applying changes.'; END IF;
  IF p_kind NOT IN ('salary', 'ss', 'irs') OR p_date IS NULL THEN RAISE EXCEPTION 'Choose a payment type and date'; END IF;
  p_account := coalesce(p_account, (SELECT account_id FROM salary_settings WHERE user_id = p_user));
  IF NOT EXISTS (SELECT 1 FROM financial_account WHERE id = p_account AND user_id = p_user) THEN RAISE EXCEPTION 'Choose one of your accounts'; END IF;
  amount := CASE p_kind WHEN 'salary' THEN r.net_cents WHEN 'ss' THEN r.ss_cents + r.tsu_cents ELSE r.irs_cents END;
  IF amount <= 0 THEN RAISE EXCEPTION 'There is no payment due'; END IF;
  label := CASE r.kind WHEN 'monthly' THEN 'Salary' WHEN 'holiday' THEN 'Subsídio de férias' ELSE 'Subsídio de Natal' END
    || ' · ' || r.month || ' · ' || CASE p_kind WHEN 'salary' THEN 'Personal transfer' WHEN 'ss' THEN 'Segurança Social + TSU' ELSE 'IRS' END;
  IF p_kind = 'salary' THEN
    INSERT INTO expense(user_id, account_id, title, value, iva, created_at)
      VALUES(p_user, p_account, label, amount / 100.0, false, p_date) RETURNING id INTO linked_id;
    INSERT INTO payroll_payment(record_id, kind, expense_id) VALUES(p_id, p_kind, linked_id);
  ELSE
    INSERT INTO "transaction"(user_id, account_id, type, description, value, created_at)
      VALUES(p_user, p_account, 'expense', label, amount / 100.0, p_date) RETURNING id INTO linked_id;
    INSERT INTO payroll_payment(record_id, kind, transaction_id) VALUES(p_id, p_kind, linked_id);
  END IF;
END $$;

CREATE OR REPLACE FUNCTION payroll_unpay(p_user text, p_id uuid, p_kind text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE linked_expense uuid; linked_transaction uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  IF NOT EXISTS (SELECT 1 FROM payroll_record WHERE id = p_id AND user_id = p_user) THEN RAISE EXCEPTION 'Payroll record not found'; END IF;
  DELETE FROM payroll_payment WHERE record_id = p_id AND kind = p_kind RETURNING expense_id, transaction_id INTO linked_expense, linked_transaction;
  IF linked_expense IS NOT NULL THEN DELETE FROM expense WHERE id = linked_expense AND user_id = p_user; END IF;
  IF linked_transaction IS NOT NULL THEN DELETE FROM "transaction" WHERE id = linked_transaction AND user_id = p_user; END IF;
END $$;
COMMIT;
