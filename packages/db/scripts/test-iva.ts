import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { sqlStatements } from "./sql-statements";
config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
const schema = `iva_test_${crypto.randomUUID().replaceAll("-", "")}`;
const read = (path: string) => sqlStatements(readFileSync(new URL(path, import.meta.url), "utf8"));
// All fixtures and migration objects live in a private, uncommitted schema.
// The last statement deliberately rolls back the entire test transaction.
const statements = [
  `CREATE SCHEMA ${schema}`,
  `SET LOCAL search_path TO ${schema}, public`,
  ...read("../tests/iva.sql"),
  ...read("../sql/20260919_iva_quarters.sql"),
  ...read("../tests/iva-cases.sql"),
  "DO $$ BEGIN RAISE EXCEPTION 'IVA_TEST_ROLLBACK_OK'; END $$",
];
try {
  await db.transaction(statements.map((statement) => db.query(statement, [])));
  throw new Error("Test transaction should have rolled back");
} catch (error) {
  if (error instanceof Error && error.message === "IVA_TEST_ROLLBACK_OK")
    console.log("IVA database cases passed. All test objects rolled back.");
  else {
    console.error(error instanceof Error ? error.message : "IVA database tests failed");
    process.exitCode = 1;
  }
}
