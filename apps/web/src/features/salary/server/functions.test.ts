import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { createTestDb } from "@company-manager/db/testing";
import * as operators from "@company-manager/db/operators";
import * as payroll from "@company-manager/db/schema/payroll";
import * as expenses from "@company-manager/db/schema/expense";
import * as transactions from "@company-manager/db/schema/transactions";
import * as validators from "../schemas/validators";
import { DEFAULT_VALUES } from "../lib/calculations";

type Endpoint = {
  middleware: unknown[];
  handler: (args: {
    context: { session: { user: { id: string } } | null };
    data?: unknown;
  }) => Promise<unknown>;
};
function loadServer(failure?: Error) {
  const authMiddleware = {};
  const db = createTestDb();
  const statements: { sql: string; params: unknown[] }[] = [];
  let calls = 0;
  const modules: Record<string, unknown> = {
    "@/middleware/auth": { authMiddleware },
    "@/features/accounts/server/queries": { requireOwnedAccount: async () => {} },
    "@company-manager/db": {
      createDb: () => {
        calls++;
        return {
          execute: async (statement: ReturnType<typeof operators.sql>) => {
            statements.push(db.select({ statement }).from(payroll.payrollRecord).toSQL());
            if (failure) throw failure;
            return { rows: [{ per_diem_cents: 10000, per_diem_days: 2, kilometres: 25 }] };
          },
        };
      },
    },
    "@company-manager/db/operators": operators,
    "@company-manager/db/schema/payroll": payroll,
    "@company-manager/db/schema/expense": expenses,
    "@company-manager/db/schema/transactions": transactions,
    "@tanstack/react-query": { queryOptions: (options: unknown) => options },
    "../schemas/validators": validators,
    "@tanstack/react-start": {
      createServerFn: () => {
        let middleware: unknown[] = [];
        const builder = {
          middleware: (items: unknown[]) => {
            middleware = items;
            return builder;
          },
          validator: () => builder,
          handler: (handler: Endpoint["handler"]) => ({ middleware, handler }),
        };
        return builder;
      },
    },
  };
  const compiled = ts.transpileModule(
    readFileSync(new URL("./functions.ts", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  );
  const exports: Record<string, Endpoint> = {};
  runInNewContext(compiled.outputText, {
    exports,
    Error,
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
      return modules[name];
    },
  });
  return { endpoints: exports, statements, authMiddleware, calls: () => calls };
}

describe("payroll server boundaries", () => {
  for (const name of [
    "getSalary",
    "getSalaryTravel",
    "saveSalarySettings",
    "generatePayroll",
    "applyPayroll",
    "payPayroll",
    "unpayPayroll",
    "deletePayroll",
  ]) {
    it(`${name} requires authentication before database access`, async () => {
      const server = loadServer();
      const endpoint = server.endpoints[name]!;
      assert.equal(endpoint.middleware[0], server.authMiddleware);
      await assert.rejects(endpoint.handler({ context: { session: null }, data: {} }), /signed in/);
      assert.equal(server.calls(), 0);
    });
  }
  it("uses only the signed-in owner and parameterizes all mutation inputs", async () => {
    const server = loadServer();
    const owner = "owner-'quoted";
    const context = { session: { user: { id: owner } } };
    await server.endpoints.generatePayroll!.handler({
      context,
      data: {
        userId: "foreign",
        month: "2026-09",
        kind: "monthly",
        values: DEFAULT_VALUES,
        expected: { perDiemCents: 0, mileageCents: 0 },
      },
    });
    await server.endpoints.applyPayroll!.handler({
      context,
      data: { userId: "foreign", id: "record", revision: 3, values: DEFAULT_VALUES },
    });
    await server.endpoints.payPayroll!.handler({
      context,
      data: {
        userId: "foreign",
        id: "record",
        kind: "ss",
        date: "2026-10-20",
        accountId: "account",
        revision: 3,
      },
    });
    await server.endpoints.unpayPayroll!.handler({
      context,
      data: { userId: "foreign", id: "record", kind: "ss" },
    });
    await server.endpoints.deletePayroll!.handler({
      context,
      data: { userId: "foreign", id: "record", revision: 3 },
    });
    assert.equal(server.statements.length, 5);
    for (const query of server.statements) {
      assert.ok(query.params.includes(owner));
      assert.ok(!query.params.includes("foreign"));
      assert.ok(!query.sql.includes(owner));
    }
  });
  it("sanitizes database errors but retains actionable conflict errors", async () => {
    const context = { session: { user: { id: "owner" } } };
    const data = { id: "record", kind: "ss" };
    const failure = loadServer(new Error("secret SQL parameters"));
    await assert.rejects(
      failure.endpoints.unpayPayroll!.handler({ context, data }),
      /Could not save payroll/,
    );
    const conflict = loadServer(Object.assign(new Error("duplicate"), { code: "23505" }));
    await assert.rejects(
      conflict.endpoints.unpayPayroll!.handler({ context, data }),
      /already exists/,
    );
  });
});
