import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
try {
  const results = await db.transaction(
    [
      db`select to_regclass('iva_quarter') is not null as quarter_table_present`,
      db`select proname from pg_proc where proname in ('iva_ledger','iva_close_quarter','iva_reopen_quarter','iva_guard_document') order by proname`,
      db`select tgname, tgenabled from pg_trigger where tgname in ('invoice_iva_guard','expense_iva_guard') order by tgname`,
      db`select count(*)::integer as owners_checked, coalesce(bool_and((select count(*) > 0 from iva_ledger(u.id, extract(year from current_date)::integer))), true) as ledgers_readable from "user" u`,
      db`select count(*)::integer as invalid_snapshots from iva_quarter where status = 'closed' and (government_cents is null or sales_cents is null or deductions_cents is null or carry_in_cents is null or carry_out_cents is null or government_cents <> greatest(0, sales_cents - deductions_cents - carry_in_cents) or carry_out_cents <> greatest(0, deductions_cents + carry_in_cents - sales_cents))`,
    ],
    { readOnly: true },
  );
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : "IVA audit failed");
  process.exitCode = 1;
}
