import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { sqlStatements } from "./sql-statements";
config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
const [installed] = await db`select
  to_regclass('public.payroll_record') is not null as records_table,
  to_regprocedure('public.payroll_generate(text,text,text,jsonb,jsonb)') is not null as generate_function,
  to_regprocedure('public.payroll_apply(text,uuid,integer,jsonb)') is not null as apply_function,
  to_regprocedure('public.payroll_pay(text,uuid,text,date,uuid,integer)') is not null as payment_function,
  to_regprocedure('public.payroll_unpay(text,uuid,text)') is not null as undo_function,
  exists(select 1 from pg_trigger where tgname = 'payroll_sync_expenses' and tgrelid = to_regclass('public.payroll_record')) as expense_sync,
  exists(select 1 from pg_trigger where tgname = 'journey_payroll_guard' and tgrelid = to_regclass('public.journey')) as month_guard`;
console.log("Installed payroll objects:", installed);
const schema = `payroll_test_${crypto.randomUUID().replaceAll("-", "")}`;
const read = (path: string) => sqlStatements(readFileSync(new URL(path, import.meta.url), "utf8"));
const statements = [
  `CREATE SCHEMA ${schema}`,
  `SET LOCAL search_path TO ${schema}, public`,
  ...read("../tests/iva.sql"),
  ...read("../tests/payroll.sql"),
  ...read("../sql/20260919_iva_quarters.sql"),
  ...read("../sql/20260920_payroll.sql"),
  ...read("../tests/payroll-cases.sql"),
  ...read("../sql/20260920_payroll_delete.sql"),
  ...read("../tests/payroll-delete-cases.sql"),
  ...read("../tests/payroll-tax-fixture.sql"),
  ...read("../sql/20260920_payroll_tax_transactions.sql"),
  ...read("../sql/20260920_payroll_tax_transactions.sql"),
  ...read("../tests/payroll-tax-cases.sql"),
  ...read("../tests/payroll-delete-cases.sql"),
  "DO $$ BEGIN RAISE EXCEPTION 'PAYROLL_TEST_ROLLBACK_OK'; END $$",
];
try {
  await db.transaction(statements.map((statement) => db.query(statement, [])));
  throw new Error("Test transaction should have rolled back");
} catch (error) {
  if (error instanceof Error && error.message === "PAYROLL_TEST_ROLLBACK_OK")
    console.log("Payroll database cases passed. All test objects rolled back.");
  else {
    console.error(error instanceof Error ? error.message : "Payroll database tests failed");
    process.exitCode = 1;
  }
}
