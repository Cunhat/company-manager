import { config } from "dotenv";
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";
import { sqlStatements } from "./sql-statements";
config({ path: new URL("../../../apps/web/.env", import.meta.url).pathname, quiet: true });
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not configured");
const db = neon(process.env.DATABASE_URL);
try {
  const source = readFileSync(new URL("../sql/20260919_iva_quarters.sql", import.meta.url), "utf8");
  await db.transaction(sqlStatements(source).map((statement) => db.query(statement, [])));
  console.log("IVA table, functions, indexes and document-lock triggers applied.");
} catch (error) {
  console.error(error instanceof Error ? error.message : "IVA migration failed");
  process.exitCode = 1;
}
