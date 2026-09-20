# Owner salary

`/salary` manages an owner's salary settings, monthly payroll and two annual bonuses. Records are internal calculations, not statutory payslips. The accountant supplies the official documents.

## Database setup

Apply `packages/db/sql/20260920_payroll.sql`, `packages/db/sql/20260920_payroll_tax_transactions.sql` and `packages/db/sql/20260920_payroll_delete.sql` in that order after the existing accounts, per diem and IVA upgrades. From the repository root:

```sh
bun packages/db/scripts/migrate-payroll.ts
```

This reads `apps/web/.env`, or an existing `DATABASE_URL` environment variable. It runs the migration in one transaction and can be rerun. A Drizzle schema push alone does **not** install the calculation functions or locking triggers. Deploy the migration before deploying the application changes, since expense and travel queries now depend on payroll tables.

For an existing payroll installation, `bun packages/db/scripts/migrate-payroll-delete.ts` installs only the deletion function. It supports both legacy expense payments and tax transactions and does not change existing records.

## Calculations

Amounts are integer cents. Rates are integer basis points, so 23.75% is 2375. Initial form values use the supplied example: €1,750 gross, €130 meal allowance, 11% employee SS, 23.75% employer TSU, 13.03% IRS. These defaults are editable and are not an automatic determination of legally applicable rates.

Each contribution rounds to cents separately. IRS can use an explicit amount for that record to match the accountant's withholding. At €1,750 gross, 13.03% rounds to €228.03, while the supplied payslip withholds €228.00. Entering €228.00 as the override reproduces it exactly.

- Personal transfer = gross − employee SS − IRS + meal allowance + per diems + mileage.
- Social Security payment = employee SS + employer TSU.
- IRS payment = withheld IRS.
- Company cost = gross + employer TSU + allowances and mileage. It equals the sum of all three payments.

Monthly records snapshot the saved per diems and mileage for the salary month. Mileage uses the existing €0.40/km rate. Per diems round each day's stored rate and percentage before summing. Holiday and Christmas bonuses contain gross salary and taxes only. Each bonus type is unique per owner and calendar year, regardless of its payment month; bonus generation does not close travel entries.

## Editing and payments

Generating monthly payroll closes additions, edits and deletion of journeys and per diems in that month. Trips crossing months are saved atomically and fail entirely if any affected month is closed. Payroll simulations change form state only. Apply changes preserves the travel snapshot, updates the payroll record and updates the linked salary expense and tax expense transactions in one transaction. It preserves the payment dates and accounts. Optimistic revisions prevent a stale simulation from overwriting newer values.

The personal salary transfer creates a normal expense without IVA. SS + TSU and IRS payments each create a transaction of type `expense`. Each uses its actual payment date and selected account. The configured usual account is preselected. Repeated payment submissions cannot create duplicates. Zero amounts are shown as not due. Undo payment removes its linked expense or transaction and returns it to unpaid; the payment can then be recorded with a corrected date or account.

Linked expenses and transactions are managed from Salary to avoid divergence between payroll and account balances. Existing IVA quarter locks still apply to salary expense changes; tax transactions are independent of IVA closure. A failed update rolls back the payroll edit or payment change too. Changing salary settings affects future records only. Payroll totals use the salary month; expenses and tax transactions use the actual payment date. Account deletion preserves unassigned salary expenses and removes tax transactions with their payment links, following the existing account deletion rules.

The Edit dialog includes a confirmed Delete salary action. Deleting removes the record and its linked payments, salary expense and tax transactions atomically. Monthly deletion reopens travel entry for that month and preserves existing per diems and journeys. Deleting a bonus permits generating it again that year. Ownership, revision checks and existing IVA locks apply; any failure leaves all records intact.

The tax transaction upgrade converts existing linked SS and IRS expenses without changing amounts, accounts or dates. It leaves unrelated expenses and salary transfers intact. The conversion is atomic and rerunnable. It rejects legacy tax expenses with IVA or without an owned account instead of guessing how to reclassify them. Non-IVA tax expenses in closed quarters are converted under an exclusive table lock; the IVA guard is restored before commit.

## Verification

```sh
bun test apps/web/src/features/salary/lib apps/web/src/features/salary/server
bun test apps/web/src/features/salary/components/salary-editor.test.tsx
bun test apps/web/src/features/salary/components/delete-salary-dialog.test.tsx
bun packages/db/scripts/test-payroll.ts
bunx tsc --noEmit -p apps/web/tsconfig.json
```

The database test first checks installed objects, then creates isolated fixtures and migration objects in a private schema. All test changes roll back, even on success. It never creates real payroll or expense records.
