-- Owner payroll. Run after accounts, per diems and IVA migrations.
BEGIN;
CREATE TABLE IF NOT EXISTS salary_settings (
  user_id text PRIMARY KEY REFERENCES "user"(id) ON DELETE CASCADE,
  gross_cents integer NOT NULL, meal_cents integer NOT NULL DEFAULT 13000,
  ss_rate integer NOT NULL DEFAULT 1100, tsu_rate integer NOT NULL DEFAULT 2375,
  irs_rate integer NOT NULL DEFAULT 1303,
  account_id uuid REFERENCES financial_account(id) ON DELETE SET NULL,
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT salary_settings_amounts CHECK (gross_cents BETWEEN 1 AND 100000000 AND meal_cents BETWEEN 0 AND 100000000),
  CONSTRAINT salary_settings_rates CHECK (ss_rate BETWEEN 0 AND 10000 AND tsu_rate BETWEEN 0 AND 10000 AND irs_rate BETWEEN 0 AND 10000 AND ss_rate + irs_rate <= 10000)
);
CREATE TABLE IF NOT EXISTS payroll_record (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  month text NOT NULL, kind text NOT NULL,
  gross_cents integer NOT NULL, meal_cents integer NOT NULL DEFAULT 13000,
  ss_rate integer NOT NULL DEFAULT 1100, tsu_rate integer NOT NULL DEFAULT 2375,
  irs_rate integer NOT NULL DEFAULT 1303, irs_override_cents integer,
  per_diem_cents integer NOT NULL DEFAULT 0, mileage_cents integer NOT NULL DEFAULT 0,
  kilometres integer NOT NULL DEFAULT 0, per_diem_days integer NOT NULL DEFAULT 0,
  ss_cents integer NOT NULL, tsu_cents integer NOT NULL, irs_cents integer NOT NULL,
  net_cents integer NOT NULL, company_cents integer NOT NULL,
  revision integer NOT NULL DEFAULT 1,
  created_at timestamp NOT NULL DEFAULT now(), updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT payroll_record_month_check CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CONSTRAINT payroll_record_kind_check CHECK (kind IN ('monthly', 'holiday', 'christmas')),
  CONSTRAINT payroll_record_amounts CHECK (gross_cents BETWEEN 1 AND 100000000 AND meal_cents BETWEEN 0 AND 100000000 AND net_cents >= 0 AND irs_cents >= 0 AND ss_cents + irs_cents <= gross_cents),
  CONSTRAINT payroll_record_rates CHECK (ss_rate BETWEEN 0 AND 10000 AND tsu_rate BETWEEN 0 AND 10000 AND irs_rate BETWEEN 0 AND 10000 AND ss_rate + irs_rate <= 10000)
);
CREATE INDEX IF NOT EXISTS payroll_record_user_month_idx ON payroll_record(user_id, month);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_record_month_unique ON payroll_record(user_id, month) WHERE kind = 'monthly';
CREATE UNIQUE INDEX IF NOT EXISTS payroll_record_bonus_unique ON payroll_record(user_id, kind, left(month, 4)) WHERE kind <> 'monthly';
CREATE TABLE IF NOT EXISTS payroll_payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES payroll_record(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('salary', 'ss', 'irs')),
  expense_id uuid NOT NULL REFERENCES expense(id) ON DELETE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_payment_record_kind_unique ON payroll_payment(record_id, kind);
CREATE UNIQUE INDEX IF NOT EXISTS payroll_payment_expense_unique ON payroll_payment(expense_id);

-- Also upgrade tables already created by a schema push. Direct expense deletion
-- is guarded below; cascading here preserves the existing user-deletion flow.
DO $$
DECLARE fk record;
BEGIN
  FOR fk IN SELECT conname FROM pg_constraint WHERE contype = 'f'
    AND conrelid = 'payroll_payment'::regclass AND confrelid = 'expense'::regclass
  LOOP
    EXECUTE format('ALTER TABLE payroll_payment DROP CONSTRAINT %I', fk.conname);
  END LOOP;
  ALTER TABLE payroll_payment ADD CONSTRAINT payroll_payment_expense_id_expense_id_fk
    FOREIGN KEY (expense_id) REFERENCES expense(id) ON DELETE CASCADE;
END $$;

-- Serialize month closure with travel changes, including trips spanning two months.
CREATE OR REPLACE FUNCTION payroll_guard_travel() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; old_month text; new_month text;
BEGIN
  owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || owner_id, 0));
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM "user" WHERE id = owner_id) THEN RETURN OLD; END IF;
  IF TG_OP = 'UPDATE' AND NEW.user_id <> OLD.user_id THEN RAISE EXCEPTION 'Changing the owner is not allowed'; END IF;
  IF TG_OP <> 'INSERT' THEN old_month := to_char(OLD.date, 'YYYY-MM'); END IF;
  IF TG_OP <> 'DELETE' THEN new_month := to_char(NEW.date, 'YYYY-MM'); END IF;
  IF EXISTS (SELECT 1 FROM payroll_record WHERE user_id = owner_id AND kind = 'monthly' AND month IN (old_month, new_month)) THEN
    RAISE EXCEPTION 'This month is closed by payroll. Change salary values on the Salary page.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS journey_payroll_guard ON journey;
CREATE TRIGGER journey_payroll_guard BEFORE INSERT OR UPDATE OR DELETE ON journey FOR EACH ROW EXECUTE FUNCTION payroll_guard_travel();
DROP TRIGGER IF EXISTS per_diem_payroll_guard ON per_diem;
CREATE TRIGGER per_diem_payroll_guard BEFORE INSERT OR UPDATE OR DELETE ON per_diem FOR EACH ROW EXECUTE FUNCTION payroll_guard_travel();

CREATE OR REPLACE FUNCTION payroll_calculate() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || NEW.user_id, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || NEW.user_id, 0));
  IF TG_OP = 'INSERT' THEN
    IF NEW.kind = 'monthly' THEN
      SELECT coalesce(sum(round(daily_rate_cents::numeric * percentage / 100)), 0), count(*)
        INTO NEW.per_diem_cents, NEW.per_diem_days FROM per_diem
        WHERE user_id = NEW.user_id AND date >= (NEW.month || '-01')::date AND date < (NEW.month || '-01')::date + interval '1 month';
      SELECT coalesce(sum(distance), 0) INTO NEW.kilometres FROM journey
        WHERE user_id = NEW.user_id AND date >= (NEW.month || '-01')::date AND date < (NEW.month || '-01')::date + interval '1 month';
      NEW.mileage_cents := NEW.kilometres * 40;
    END IF;
    NEW.revision := 1;
  ELSE
    IF (NEW.id, NEW.user_id, NEW.month, NEW.kind) IS DISTINCT FROM (OLD.id, OLD.user_id, OLD.month, OLD.kind) THEN
      RAISE EXCEPTION 'The payroll period and type cannot be changed';
    END IF;
    NEW.per_diem_cents := OLD.per_diem_cents; NEW.per_diem_days := OLD.per_diem_days;
    NEW.mileage_cents := OLD.mileage_cents; NEW.kilometres := OLD.kilometres;
    NEW.revision := OLD.revision + 1;
  END IF;
  IF NEW.kind <> 'monthly' THEN
    NEW.meal_cents := 0; NEW.per_diem_cents := 0; NEW.mileage_cents := 0;
    NEW.per_diem_days := 0; NEW.kilometres := 0;
  END IF;
  NEW.ss_cents := round(NEW.gross_cents::numeric * NEW.ss_rate / 10000);
  NEW.tsu_cents := round(NEW.gross_cents::numeric * NEW.tsu_rate / 10000);
  NEW.irs_cents := coalesce(NEW.irs_override_cents, round(NEW.gross_cents::numeric * NEW.irs_rate / 10000));
  NEW.net_cents := NEW.gross_cents - NEW.ss_cents - NEW.irs_cents + NEW.meal_cents + NEW.per_diem_cents + NEW.mileage_cents;
  NEW.company_cents := NEW.gross_cents + NEW.tsu_cents + NEW.meal_cents + NEW.per_diem_cents + NEW.mileage_cents;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payroll_calculate ON payroll_record;
CREATE TRIGGER payroll_calculate BEFORE INSERT OR UPDATE ON payroll_record FOR EACH ROW EXECUTE FUNCTION payroll_calculate();

-- Only an applied payroll edit may change a linked expense's value. All updates
-- still pass through the existing IVA guard, and roll back together on failure.
CREATE OR REPLACE FUNCTION payroll_sync_expenses() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  UPDATE expense e SET value = CASE p.kind WHEN 'salary' THEN NEW.net_cents WHEN 'ss' THEN NEW.ss_cents + NEW.tsu_cents ELSE NEW.irs_cents END / 100.0,
    updated_at = now()
    FROM payroll_payment p WHERE p.record_id = NEW.id AND p.expense_id = e.id
    AND e.value IS DISTINCT FROM CASE p.kind WHEN 'salary' THEN NEW.net_cents WHEN 'ss' THEN NEW.ss_cents + NEW.tsu_cents ELSE NEW.irs_cents END / 100.0;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payroll_sync_expenses ON payroll_record;
CREATE TRIGGER payroll_sync_expenses AFTER UPDATE ON payroll_record FOR EACH ROW EXECUTE FUNCTION payroll_sync_expenses();
CREATE OR REPLACE FUNCTION payroll_guard_expense() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.account_id IS NULL AND OLD.account_id IS NOT NULL
    AND (to_jsonb(NEW) - 'account_id') = (to_jsonb(OLD) - 'account_id') THEN RETURN NEW; END IF;
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM "user" WHERE id = OLD.user_id) THEN RETURN OLD; END IF;
  IF pg_trigger_depth() = 1 AND EXISTS (SELECT 1 FROM payroll_payment WHERE expense_id = OLD.id) THEN
    RAISE EXCEPTION 'This expense is linked to payroll. Edit its payment on the Salary page.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS expense_payroll_guard ON expense;
CREATE TRIGGER expense_payroll_guard BEFORE UPDATE OR DELETE ON expense FOR EACH ROW EXECUTE FUNCTION payroll_guard_expense();

CREATE OR REPLACE FUNCTION payroll_generate(p_user text, p_month text, p_kind text, p_values jsonb, p_expected jsonb)
RETURNS uuid LANGUAGE plpgsql AS $$
DECLARE saved payroll_record;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  INSERT INTO payroll_record(user_id, month, kind, gross_cents, meal_cents, ss_rate, tsu_rate, irs_rate, irs_override_cents)
    VALUES(p_user, p_month, p_kind, (p_values->>'grossCents')::integer, (p_values->>'mealCents')::integer,
      (p_values->>'ssRate')::integer, (p_values->>'tsuRate')::integer, (p_values->>'irsRate')::integer, (p_values->>'irsOverrideCents')::integer)
    RETURNING * INTO saved;
  IF p_kind = 'monthly' AND (saved.per_diem_cents <> (p_expected->>'perDiemCents')::integer OR saved.mileage_cents <> (p_expected->>'mileageCents')::integer) THEN
    RAISE EXCEPTION 'Travel amounts changed. Refresh the preview before generating payroll.';
  END IF;
  RETURN saved.id;
END $$;

CREATE OR REPLACE FUNCTION payroll_apply(p_user text, p_id uuid, p_revision integer, p_values jsonb)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  UPDATE payroll_record SET gross_cents = (p_values->>'grossCents')::integer, meal_cents = (p_values->>'mealCents')::integer,
    ss_rate = (p_values->>'ssRate')::integer, tsu_rate = (p_values->>'tsuRate')::integer, irs_rate = (p_values->>'irsRate')::integer,
    irs_override_cents = (p_values->>'irsOverrideCents')::integer
    WHERE id = p_id AND user_id = p_user AND revision = p_revision;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll changed or is unavailable. Refresh before applying changes.'; END IF;
END $$;

CREATE OR REPLACE FUNCTION payroll_pay(p_user text, p_id uuid, p_kind text, p_date date, p_account uuid, p_revision integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE r payroll_record; amount integer; expense_id uuid; label text;
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
  label := CASE r.kind WHEN 'monthly' THEN 'Salary' WHEN 'holiday' THEN 'Subsídio de férias' ELSE 'Subsídio de Natal' END;
  INSERT INTO expense(user_id, account_id, title, value, iva, created_at)
    VALUES(p_user, p_account, label || ' · ' || r.month || ' · ' || CASE p_kind WHEN 'salary' THEN 'Personal transfer' WHEN 'ss' THEN 'Segurança Social + TSU' ELSE 'IRS' END, amount / 100.0, false, p_date)
    RETURNING id INTO expense_id;
  INSERT INTO payroll_payment(record_id, kind, expense_id) VALUES(p_id, p_kind, expense_id);
END $$;

CREATE OR REPLACE FUNCTION payroll_unpay(p_user text, p_id uuid, p_kind text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE linked_expense uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  IF NOT EXISTS (SELECT 1 FROM payroll_record WHERE id = p_id AND user_id = p_user) THEN RAISE EXCEPTION 'Payroll record not found'; END IF;
  DELETE FROM payroll_payment WHERE record_id = p_id AND kind = p_kind RETURNING expense_id INTO linked_expense;
  IF linked_expense IS NOT NULL THEN DELETE FROM expense WHERE id = linked_expense AND user_id = p_user; END IF;
END $$;
COMMIT;
