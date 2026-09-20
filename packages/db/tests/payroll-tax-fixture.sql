CREATE TABLE payroll_tax_fixture (record_id uuid, account_id uuid, salary_expense_id uuid);
DO $$
DECLARE account uuid; payroll_id uuid;
BEGIN
  INSERT INTO "user" VALUES ('tax-owner');
  INSERT INTO financial_account(user_id) VALUES ('tax-owner') RETURNING id INTO account;
  payroll_id := payroll_generate('tax-owner', '2026-09', 'monthly',
    '{"grossCents":100000,"mealCents":0,"ssRate":1100,"tsuRate":2375,"irsRate":1350,"irsOverrideCents":null}',
    '{"perDiemCents":0,"mileageCents":0}');
  PERFORM payroll_pay('tax-owner', payroll_id, 'salary', '2026-10-01', account, 1);
  PERFORM payroll_pay('tax-owner', payroll_id, 'ss', '2026-10-20', account, 1);
  PERFORM payroll_pay('tax-owner', payroll_id, 'irs', '2026-10-21', account, 1);
  INSERT INTO payroll_tax_fixture SELECT payroll_id, account, expense_id FROM payroll_payment WHERE record_id = payroll_id AND kind = 'salary';
  -- Unrelated supplier expense and manual transaction must not be reclassified.
  INSERT INTO expense(user_id, account_id, title, value, iva, created_at) VALUES ('tax-owner', account, 'Supplier', 123, true, '2026-10-10');
  INSERT INTO "transaction"(user_id, account_id, type, description, value, created_at) VALUES ('tax-owner', account, 'income', 'Other', 50, '2026-10-10');
  INSERT INTO iva_quarter(user_id, year, quarter, status) VALUES ('tax-owner', 2026, 4, 'closed');
END $$;
