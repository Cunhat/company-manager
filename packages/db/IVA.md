# Quarterly IVA

`sql/20260919_iva_quarters.sql` adds the quarter table, calculation function,
close/reopen functions, and document-lock triggers. Apply it after the existing
accounts/transactions migration. A Drizzle schema push alone does not install the
functions or triggers.

From the repository root:

```sh
bun packages/db/scripts/test-iva.ts
bun packages/db/scripts/migrate-iva.ts
bun packages/db/scripts/audit-iva.ts
```

These commands load the existing `apps/web/.env` database configuration without
printing credentials. The migration is atomic and safe to rerun. The audit is
read-only. The database test creates an isolated schema in a single transaction,
checks realistic workflows, and deliberately rolls back every fixture and object.

## Calculation and persistence

`iva_ledger` is the shared calculation for the page, dashboard, and closing checks.
It derives open quarters from invoices and expenses, rounds IVA per document in
integer cents, and passes unused deductions forward. Tracking begins at Q1 of the
earliest year with documents or a saved quarter. Missing quarters inside that
history still need to close in order, even when their payment is zero.

Closed quarters store confirmed snapshots in `iva_quarter`. Reopened quarters show
live figures but keep their original carryover feeding later quarters. Reclosing
must restore the original payable and carryover values. Reopening deletes the linked
IVA payment transaction and clears its link in the same database operation. Closing
again creates a fresh payment using the selected account and payment date, unless
nothing is due. Ordinary transaction edits do not change the confirmed government
amount. Reopening also works when the linked transaction was already deleted.

Both close/reopen functions and document-write triggers acquire the same advisory
transaction lock per owner. The triggers validate original and destination dates.
Account deletion can still unassign invoices and expenses without changing their
IVA values. New documents cannot silently extend the history behind its first
confirmed quarter.

The legacy invoice `iva_status` column is retained to avoid deleting historical
data. It is no longer edited or used to calculate/display quarter payment status.

## Tests

Run the IVA calculation/validation and component tests:

```sh
bun test apps/web/src/features/iva/lib/quarters.test.ts
bun test apps/web/src/features/iva/components/iva.test.tsx
```

Existing DOM-based test files initialize their own global browser environments.
Run those files separately to avoid their shared-global interference under Bun.
