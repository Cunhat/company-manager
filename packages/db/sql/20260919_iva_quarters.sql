-- Apply after the account/transaction migration. Safe to rerun.
-- Calculations and closure run in PostgreSQL so the HTTP driver needs no
-- interactive transaction. All document writes and closure share a user lock.
BEGIN;
CREATE TABLE IF NOT EXISTS iva_quarter (
  id uuid PRIMARY KEY DEFAULT uuidv7(),
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  year integer NOT NULL,
  quarter integer NOT NULL CONSTRAINT iva_quarter_valid_quarter CHECK (quarter BETWEEN 1 AND 4),
  status text NOT NULL DEFAULT 'open' CONSTRAINT iva_quarter_valid_status CHECK (status IN ('open', 'closed')),
  government_cents numeric(16,0),
  sales_cents numeric(16,0),
  deductions_cents numeric(16,0),
  carry_in_cents numeric(16,0),
  carry_out_cents numeric(16,0),
  payment_transaction_id uuid,
  closed_at timestamp,
  reopened_at timestamp,
  CONSTRAINT iva_quarter_user_period_unique UNIQUE(user_id, year, quarter)
);
CREATE INDEX IF NOT EXISTS invoice_iva_period_idx ON invoice(user_id, created_at);
CREATE INDEX IF NOT EXISTS expense_iva_period_idx ON expense(user_id, created_at);

-- Canonical ledger, shared by the page, dashboard and close validation.
-- Start at Q1 of the earliest tracked year. Empty intervening quarters count.
-- A reopened quarter displays live figures, but its original carry-out continues
-- to feed later quarters until it is reconciled. Later closed quarters never move.
CREATE OR REPLACE FUNCTION iva_ledger(p_user text, p_end_year integer)
RETURNS TABLE (
  year integer, quarter integer, status text,
  sales_cents numeric, deductions_cents numeric, carry_in_cents numeric,
  payable_cents numeric, carry_out_cents numeric,
  government_cents numeric, confirmed_carry_out_cents numeric,
  unpaid_invoices integer, previous_closed boolean,
  payment_transaction_id uuid, closed_at timestamp
) LANGUAGE sql STABLE AS $$
  WITH RECURSIVE
  first_year AS (
    SELECT least(p_end_year, coalesce(min(y), p_end_year))::integer AS y FROM (
      SELECT extract(year FROM created_at)::integer y FROM invoice WHERE user_id = p_user
      UNION ALL SELECT extract(year FROM created_at)::integer FROM expense WHERE user_id = p_user
      UNION ALL SELECT q.year FROM iva_quarter q WHERE q.user_id = p_user
    ) dates
  ), sales AS (
    SELECT extract(year FROM created_at)::integer y, extract(quarter FROM created_at)::integer q,
      sum(round(value * 100 * 0.23)) cents,
      count(*) FILTER (WHERE invoice.status = 'pending')::integer unpaid
    FROM invoice WHERE user_id = p_user AND invoice.status <> 'cancelled' GROUP BY 1, 2
  ), deductions AS (
    SELECT extract(year FROM created_at)::integer y, extract(quarter FROM created_at)::integer q,
      sum(round(value * 100) - round(value * 100 / 1.23)) cents
    FROM expense WHERE user_id = p_user AND iva GROUP BY 1, 2
  ), periods AS (
    SELECT i, (i / 4)::integer y, (i % 4 + 1)::integer q,
      coalesce(s.cents, 0) sales, coalesce(d.cents, 0) deductions,
      coalesce(s.unpaid, 0) unpaid,
      saved.status saved_status, saved.government_cents government,
      saved.sales_cents saved_sales, saved.deductions_cents saved_deductions,
      saved.carry_in_cents saved_in, saved.carry_out_cents saved_out,
      saved.payment_transaction_id payment_id, saved.closed_at closed
    FROM first_year f CROSS JOIN generate_series(f.y * 4, p_end_year * 4 + 3) i
    LEFT JOIN sales s ON s.y = i / 4 AND s.q = i % 4 + 1
    LEFT JOIN deductions d ON d.y = i / 4 AND d.q = i % 4 + 1
    LEFT JOIN iva_quarter saved ON saved.user_id = p_user AND saved.year = i / 4 AND saved.quarter = i % 4 + 1
  ), ledger AS (
    SELECT p.*, 0::numeric incoming, true prior_closed,
      coalesce(p.saved_out, greatest(0, p.deductions - p.sales)) effective_out
    FROM periods p WHERE i = (SELECT min(i) FROM periods)
    UNION ALL
    SELECT p.*, prev.effective_out, prev.prior_closed AND coalesce(prev.saved_status = 'closed', false),
      coalesce(p.saved_out, greatest(0, p.deductions + prev.effective_out - p.sales))
    FROM ledger prev JOIN periods p ON p.i = prev.i + 1
  )
  SELECT y, q, coalesce(saved_status, 'open'),
    CASE WHEN saved_status = 'closed' THEN saved_sales ELSE sales END,
    CASE WHEN saved_status = 'closed' THEN saved_deductions ELSE deductions END,
    CASE WHEN saved_status = 'closed' THEN saved_in ELSE incoming END,
    CASE WHEN saved_status = 'closed' THEN government ELSE greatest(0, sales - deductions - incoming) END,
    CASE WHEN saved_status = 'closed' THEN saved_out ELSE greatest(0, deductions + incoming - sales) END,
    government, saved_out, unpaid, prior_closed, payment_id, closed
  FROM ledger ORDER BY i;
$$;

CREATE OR REPLACE FUNCTION iva_guard_document() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner_id text; old_date timestamp; new_date timestamp; earliest_closed integer;
BEGIN
  owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
  -- Hash collisions merely serialize unrelated owners; they cannot weaken a lock.
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || owner_id, 0));
  IF TG_OP = 'UPDATE' AND OLD.user_id <> NEW.user_id THEN
    RAISE EXCEPTION 'Changing the owner of a financial record is not allowed';
  END IF;
  -- Allow account deletion to unassign a record without altering its IVA fields.
  IF TG_OP = 'UPDATE' AND NEW.account_id IS NULL AND OLD.account_id IS NOT NULL
    AND (to_jsonb(NEW) - 'account_id') = (to_jsonb(OLD) - 'account_id') THEN RETURN NEW; END IF;
  -- Allow the existing user-deletion cascade.
  IF TG_OP = 'DELETE' AND NOT EXISTS (SELECT 1 FROM "user" WHERE id = owner_id) THEN RETURN OLD; END IF;
  IF TG_OP <> 'INSERT' THEN old_date := OLD.created_at; END IF;
  IF TG_OP <> 'DELETE' THEN new_date := NEW.created_at; END IF;
  IF EXISTS (SELECT 1 FROM iva_quarter q WHERE q.user_id = owner_id AND q.status = 'closed'
    AND ((q.year = extract(year FROM old_date) AND q.quarter = extract(quarter FROM old_date))
      OR (q.year = extract(year FROM new_date) AND q.quarter = extract(quarter FROM new_date)))) THEN
    RAISE EXCEPTION 'This quarter is closed. Reopen it on the IVA page before changing invoices or expenses.';
  END IF;
  -- Do not silently insert new history before the established carryover chain.
  SELECT min(q.year * 4 + q.quarter - 1) INTO earliest_closed FROM iva_quarter q
    WHERE q.user_id = owner_id AND q.government_cents IS NOT NULL;
  IF new_date IS NOT NULL AND extract(year FROM new_date) * 4 + extract(quarter FROM new_date) - 1 < earliest_closed THEN
    RAISE EXCEPTION 'This document predates the confirmed IVA history. Correct its document date.';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;
DROP TRIGGER IF EXISTS invoice_iva_guard ON invoice;
CREATE TRIGGER invoice_iva_guard BEFORE INSERT OR UPDATE OR DELETE ON invoice FOR EACH ROW EXECUTE FUNCTION iva_guard_document();
DROP TRIGGER IF EXISTS expense_iva_guard ON expense;
CREATE TRIGGER expense_iva_guard BEFORE INSERT OR UPDATE OR DELETE ON expense FOR EACH ROW EXECUTE FUNCTION iva_guard_document();

CREATE OR REPLACE FUNCTION iva_close_quarter(p_user text, p_year integer, p_quarter integer,
  p_government numeric, p_account uuid DEFAULT NULL, p_date date DEFAULT NULL)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_period record; payment_id uuid;
BEGIN
  IF p_year NOT BETWEEN 1900 AND 2100 OR p_quarter NOT BETWEEN 1 AND 4
    OR p_government IS NULL OR p_government < 0 OR p_government <> trunc(p_government)
    OR p_government >= 100000000000000 THEN RAISE EXCEPTION 'Invalid quarter or government amount'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  SELECT * INTO current_period FROM iva_ledger(p_user, p_year) q WHERE q.year = p_year AND q.quarter = p_quarter;
  IF current_period.status = 'closed' THEN RAISE EXCEPTION 'This quarter is already closed'; END IF;
  IF NOT current_period.previous_closed THEN RAISE EXCEPTION 'Close all earlier quarters first'; END IF;
  IF current_period.unpaid_invoices > 0 THEN RAISE EXCEPTION 'Pay every non-cancelled invoice before closing this quarter'; END IF;
  IF current_period.payable_cents <> p_government THEN RAISE EXCEPTION 'Government amount does not match the calculated IVA'; END IF;
  IF current_period.government_cents IS NOT NULL AND
    (current_period.government_cents <> p_government OR current_period.confirmed_carry_out_cents <> current_period.carry_out_cents) THEN
    RAISE EXCEPTION 'Corrections must preserve the original payment and deduction carried forward';
  END IF;
  payment_id := current_period.payment_transaction_id;
  IF payment_id IS NULL AND p_government > 0 THEN
    IF p_date IS NULL THEN RAISE EXCEPTION 'Choose the payment date'; END IF;
    PERFORM 1 FROM financial_account WHERE id = p_account AND user_id = p_user FOR KEY SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Choose one of your accounts'; END IF;
    INSERT INTO "transaction" (user_id, account_id, type, value, description, created_at)
      VALUES (p_user, p_account, 'expense', p_government / 100, 'IVA Q' || p_quarter || ' ' || p_year, p_date)
      RETURNING id INTO payment_id;
  END IF;
  INSERT INTO iva_quarter (user_id, year, quarter, status, government_cents, sales_cents,
    deductions_cents, carry_in_cents, carry_out_cents, payment_transaction_id, closed_at)
  VALUES (p_user, p_year, p_quarter, 'closed', p_government, current_period.sales_cents,
    current_period.deductions_cents, current_period.carry_in_cents, current_period.carry_out_cents, payment_id, now())
  ON CONFLICT (user_id, year, quarter) DO UPDATE SET status = 'closed',
    government_cents = excluded.government_cents, carry_out_cents = excluded.carry_out_cents,
    payment_transaction_id = excluded.payment_transaction_id,
    sales_cents = excluded.sales_cents, deductions_cents = excluded.deductions_cents,
    carry_in_cents = excluded.carry_in_cents, closed_at = now();
END;
$$;
CREATE OR REPLACE FUNCTION iva_reopen_quarter(p_user text, p_year integer, p_quarter integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE payment_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  SELECT payment_transaction_id INTO payment_id FROM iva_quarter
    WHERE user_id = p_user AND year = p_year AND quarter = p_quarter AND status = 'closed'
    FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Closed quarter not found'; END IF;
  -- Delete only this owner's linked payment, atomically with reopening.
  DELETE FROM "transaction" WHERE id = payment_id AND user_id = p_user;
  UPDATE iva_quarter SET status = 'open', reopened_at = now(), payment_transaction_id = NULL
    WHERE user_id = p_user AND year = p_year AND quarter = p_quarter;
END;
$$;
COMMIT;
