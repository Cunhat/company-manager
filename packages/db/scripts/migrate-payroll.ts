import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { sqlStatements } from "./sql-statements";

// Drizzle push installs tables, but not the atomic payroll functions or guards.
config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
const statements = [
  "../sql/20260920_payroll.sql",
  "../sql/20260920_payroll_tax_transactions.sql",
  "../sql/20260920_payroll_delete.sql",
].flatMap((path) => sqlStatements(readFileSync(new URL(path, import.meta.url), "utf8")));
await db.transaction(statements.map((statement) => db.query(statement, [])));
console.log(
  "Payroll tables, functions and guards installed. Salary tax payments use expense transactions; existing amounts, accounts and payment dates were preserved.",
);
