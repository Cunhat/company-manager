import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import * as operators from "@company-manager/db/operators";
import { createTestDb } from "@company-manager/db/testing";
import * as accounts from "@company-manager/db/schema/account";
import * as invoices from "@company-manager/db/schema/invoice";
import * as expenses from "@company-manager/db/schema/expense";
import * as transactions from "@company-manager/db/schema/transactions";
import * as validators from "../schemas/validators";
import * as constants from "@/lib/consts";

type Call = { context: { session: { user: { id: string } } | null }; data?: unknown };
type Endpoint = { middleware: unknown[]; handler: (call: Call) => Promise<unknown> };

// Evaluate the actual server handlers with a stub transport and database.
// This avoids importing Cloudflare credentials or replacing modules in other tests.
function loadAccounts() {
  const authMiddleware = {};
  const db = createTestDb();
  let databaseCalls = 0;
  const modules: Record<string, unknown> = {
    "@/middleware/auth": { authMiddleware },
    "@company-manager/db": {
      createDb: () => {
        databaseCalls++;
        return {
          select: (fields: Parameters<typeof db.select>[0]) => ({
            from: (table: typeof accounts.financialAccount) => {
              const query = db.select(fields).from(table);
              return {
                where: (condition: Parameters<typeof query.where>[0]) => ({
                  orderBy: (order: ReturnType<typeof operators.asc>) =>
                    query.where(condition).orderBy(order).toSQL(),
                }),
              };
            },
          }),
        };
      },
    },
    "@company-manager/db/operators": operators,
    "@company-manager/db/schema/account": accounts,
    "@company-manager/db/schema/invoice": invoices,
    "@company-manager/db/schema/expense": expenses,
    "@company-manager/db/schema/transactions": transactions,
    "@/lib/consts": constants,
    "../schemas/validators": validators,
    "@tanstack/react-query": {
      mutationOptions: (options: unknown) => options,
      queryOptions: (options: unknown) => options,
    },
    "@tanstack/react-start": {
      createServerFn: () => {
        let middleware: unknown[] = [];
        const builder = {
          middleware: (items: unknown[]) => {
            middleware = items;
            return builder;
          },
          validator: () => builder,
          handler: (handler: Endpoint["handler"]): Endpoint => ({ middleware, handler }),
        };
        return builder;
      },
    },
  };
  const compiled = ts.transpileModule(
    readFileSync(new URL("./functions.ts", import.meta.url), "utf8"),
    {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    },
  );
  const exports: Record<string, Endpoint> = {};
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected server dependency: ${name}`);
      return modules[name];
    },
  });
  return { endpoint: exports.getAccounts!, authMiddleware, databaseCalls: () => databaseCalls };
}

describe("authenticated account balances", () => {
  it("registers authentication and rejects signed-out calls before opening the database", async () => {
    const server = loadAccounts();
    assert.equal(server.endpoint.middleware.length, 1);
    assert.equal(server.endpoint.middleware[0], server.authMiddleware);
    await assert.rejects(server.endpoint.handler({ context: { session: null } }), /signed in/);
    assert.equal(server.databaseCalls(), 0);
  });

  it("uses only the session owner, ignoring a supplied user ID", async () => {
    const server = loadAccounts();
    const owner = "session-owner-with-'quotes";
    const query = (await server.endpoint.handler({
      context: { session: { user: { id: owner } } },
      data: { userId: "another-user" },
    })) as { sql: string; params: unknown[] };
    assert.equal(server.databaseCalls(), 1);
    assert.ok(query.params.includes(owner));
    assert.ok(!query.params.includes("another-user"));
    assert.ok(!query.sql.includes(owner));
    assert.match(query.sql, /"financial_account"\."user_id" = \$\d+/);
    assert.match(query.sql, /"status" = 'paid'/);
    assert.match(query.sql, /sum\(round\(/);
    assert.doesNotMatch(query.sql, /\bjoin\b|iva_status/i);
    assert.ok(query.params.includes("0.23"));
  });
});
