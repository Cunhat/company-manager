DO $$
DECLARE account uuid; payroll_id uuid; bonus_id uuid; other_id uuid; values_json jsonb; travel jsonb;
BEGIN
  INSERT INTO "user" VALUES ('delete-owner'), ('delete-other');
  INSERT INTO financial_account(user_id) VALUES ('delete-owner') RETURNING id INTO account;
  values_json := '{"grossCents":175000,"mealCents":13000,"ssRate":1100,"tsuRate":2375,"irsRate":1303,"irsOverrideCents":null}';
  travel := '{"perDiemCents":7265,"mileageCents":4000}';
  INSERT INTO journey(user_id, date, distance) VALUES ('delete-owner', '2026-09-10', 100);
  INSERT INTO per_diem(user_id, date, daily_rate_cents, percentage) VALUES ('delete-owner', '2026-09-10', 7265, 100);
  payroll_id := payroll_generate('delete-owner', '2026-09', 'monthly', values_json, travel);
  BEGIN PERFORM payroll_delete('delete-other', payroll_id, 1); RAISE EXCEPTION 'FAIL foreign deletion'; EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM = 'Payroll record not found', SQLERRM; END;
  BEGIN PERFORM payroll_delete('delete-owner', payroll_id, 2); RAISE EXCEPTION 'FAIL stale deletion'; EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'Payroll changed%', SQLERRM; END;
  ASSERT EXISTS (SELECT 1 FROM payroll_record WHERE id = payroll_id), 'Rejected deletion changed record';
  -- Deleting unpaid payroll reopens the month without removing travel.
  PERFORM payroll_delete('delete-owner', payroll_id, 1);
  ASSERT NOT EXISTS (SELECT 1 FROM payroll_record WHERE id = payroll_id), 'Unpaid salary not deleted';
  ASSERT EXISTS (SELECT 1 FROM journey WHERE user_id = 'delete-owner'), 'Travel was deleted';
  ASSERT EXISTS (SELECT 1 FROM per_diem WHERE user_id = 'delete-owner'), 'Per diems were deleted';
  UPDATE journey SET distance = 120 WHERE user_id = 'delete-owner';
  UPDATE per_diem SET percentage = 50 WHERE user_id = 'delete-owner';
  payroll_id := payroll_generate('delete-owner', '2026-09', 'monthly', values_json, '{"perDiemCents":3633,"mileageCents":4800}');
  PERFORM payroll_pay('delete-owner', payroll_id, 'salary', '2026-10-01', account, 1);
  PERFORM payroll_pay('delete-owner', payroll_id, 'ss', '2026-10-20', account, 1);
  PERFORM payroll_pay('delete-owner', payroll_id, 'irs', '2026-10-20', account, 1);
  -- Process IRS first, then hit the salary expense guard; the whole deletion must roll back.
  INSERT INTO iva_quarter(user_id, year, quarter, status) VALUES ('delete-owner', 2026, 4, 'closed');
  BEGIN PERFORM payroll_delete('delete-owner', payroll_id, 1); RAISE EXCEPTION 'FAIL closed quarter'; EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'This quarter is closed%', SQLERRM; END;
  ASSERT (SELECT count(*) FROM payroll_payment WHERE record_id = payroll_id) = 3, 'Partial deletion lost payments';
  ASSERT EXISTS (SELECT 1 FROM payroll_record WHERE id = payroll_id), 'Partial deletion lost salary';
  ASSERT (SELECT count(*) FROM expense WHERE user_id = 'delete-owner') + (SELECT count(*) FROM "transaction" WHERE user_id = 'delete-owner') = 3, 'Partial deletion lost financial records';
  UPDATE iva_quarter SET status = 'open' WHERE user_id = 'delete-owner';
  INSERT INTO expense(user_id, account_id, title, value, iva, created_at) VALUES ('delete-owner', account, 'Unrelated', 123, false, '2026-10-10');
  INSERT INTO "transaction"(user_id, account_id, type, value, created_at) VALUES ('delete-owner', account, 'expense', 45, '2026-10-10');
  other_id := payroll_generate('delete-other', '2026-09', 'monthly', values_json, '{"perDiemCents":0,"mileageCents":0}');
  PERFORM payroll_delete('delete-owner', payroll_id, 1);
  ASSERT NOT EXISTS (SELECT 1 FROM payroll_payment WHERE record_id = payroll_id), 'Payment links left behind';
  ASSERT (SELECT count(*) FROM expense WHERE user_id = 'delete-owner') = 1, 'Linked expense left or unrelated expense deleted';
  ASSERT (SELECT count(*) FROM "transaction" WHERE user_id = 'delete-owner') = 1, 'Linked transactions left or unrelated transaction deleted';
  ASSERT EXISTS (SELECT 1 FROM payroll_record WHERE id = other_id), 'Another owner affected';
  INSERT INTO journey(user_id, date, distance) VALUES ('delete-owner', '2026-09-11', 20);
  -- Deleting a bonus frees that annual slot but never reopens the monthly record.
  payroll_id := payroll_generate('delete-owner', '2026-09', 'monthly', values_json, '{"perDiemCents":3633,"mileageCents":5600}');
  bonus_id := payroll_generate('delete-owner', '2026-09', 'holiday', values_json, travel);
  PERFORM payroll_delete('delete-owner', bonus_id, 1);
  bonus_id := payroll_generate('delete-owner', '2026-10', 'holiday', values_json, travel);
  BEGIN INSERT INTO journey(user_id, date, distance) VALUES ('delete-owner', '2026-09-12', 20); RAISE EXCEPTION 'FAIL bonus reopened month'; EXCEPTION WHEN raise_exception THEN ASSERT SQLERRM LIKE 'This month is closed%', SQLERRM; END;
  DELETE FROM "user" WHERE id IN ('delete-owner', 'delete-other');
END $$;
