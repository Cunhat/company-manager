import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { sqlStatements } from "./sql-statements";

config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
const statements = sqlStatements(
  readFileSync(new URL("../sql/20260920_payroll_delete.sql", import.meta.url), "utf8"),
);
await db.transaction(statements.map((statement) => db.query(statement, [])));
console.log("Salary deletion function installed. No salary or payment records were changed.");
