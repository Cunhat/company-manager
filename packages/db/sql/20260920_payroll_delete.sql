-- Uses the installed payment functions, supporting both legacy expense payments
-- and tax transactions. All removals roll back if an existing IVA guard rejects one.
BEGIN;
CREATE OR REPLACE FUNCTION payroll_delete(p_user text, p_id uuid, p_revision integer)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE saved_revision integer; payment_kind text;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('iva:' || p_user, 0));
  PERFORM pg_advisory_xact_lock(hashtextextended('payroll:' || p_user, 0));
  SELECT revision INTO saved_revision FROM payroll_record WHERE id = p_id AND user_id = p_user FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Payroll record not found'; END IF;
  IF saved_revision <> p_revision THEN RAISE EXCEPTION 'Payroll changed or is unavailable. Refresh before applying changes.'; END IF;
  FOR payment_kind IN SELECT kind FROM payroll_payment WHERE record_id = p_id ORDER BY kind
  LOOP
    PERFORM payroll_unpay(p_user, p_id, payment_kind);
  END LOOP;
  -- Deleting the monthly record reopens its travel month, without deleting travel.
  DELETE FROM payroll_record WHERE id = p_id AND user_id = p_user;
END $$;
COMMIT;
