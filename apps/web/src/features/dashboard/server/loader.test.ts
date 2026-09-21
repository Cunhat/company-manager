import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";
import { QueryClient } from "@tanstack/react-query";
import ts from "typescript";

type Source = "iva" | "accounts" | "documents" | "salary";
type Loader = (args: {
  context: { queryClient: QueryClient; session: { user: { id: string } } };
}) => Promise<void>;

function setup(failures: Source[] = []) {
  const failing = new Set(failures);
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity } },
  });
  const options = (source: Source, userId?: string) => ({
    queryKey: userId ? [source, userId] : [source],
    queryFn: async () => {
      if (failing.has(source)) throw new Error(`${source} unavailable`);
      return `${source} data`;
    },
  });
  const modules: Record<string, unknown> = {
    "@/features/iva/server/functions": { getIvaQuery: options("iva") },
    "@/features/accounts/server/functions": { getAccountsQuery: options("accounts") },
    "@/features/dashboard/server/yearly-invoices-and-expenses": {
      getYearlyInvoicesAndExpensesQuery: () => options("documents"),
    },
    "@/features/salary/server/functions": {
      getSalaryQuery: (userId: string) => options("salary", userId),
    },
    "@/features/dashboard/views/dashboard-view": { default: () => null },
    "@tanstack/react-router": { createFileRoute: () => (config: unknown) => config },
  };
  // Exercise the actual route loader and QueryClient, stubbing only transport and route registration.
  const compiled = ts.transpileModule(
    readFileSync(new URL("../../../routes/_authed/index.tsx", import.meta.url), "utf8"),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  );
  const exports: { Route?: { loader: Loader } } = {};
  runInNewContext(compiled.outputText, {
    exports,
    require: (name: string) => {
      if (!(name in modules)) throw new Error(`Unexpected dependency: ${name}`);
      return modules[name];
    },
  });
  return {
    client,
    failing,
    options,
    load: () =>
      exports.Route!.loader({
        context: { queryClient: client, session: { user: { id: "owner" } } },
      }),
  };
}

describe("dashboard loader", () => {
  for (const source of ["salary", "documents"] as const) {
    it(`keeps the dashboard available when ${source} fails and preserves a recoverable query error`, async () => {
      const test = setup([source]);
      try {
        await assert.doesNotReject(test.load());
        assert.equal(test.client.getQueryData(["accounts"]), "accounts data");
        assert.equal(test.client.getQueryData(["iva"]), "iva data");
        const query = test.options(source, source === "salary" ? "owner" : undefined);
        assert.equal(test.client.getQueryState(query.queryKey)?.status, "error");
        assert.equal(test.client.getQueryData(query.queryKey), undefined);

        test.failing.delete(source);
        await test.client.query(query);
        assert.equal(test.client.getQueryState(query.queryKey)?.status, "success");
        assert.equal(test.client.getQueryData(query.queryKey), `${source} data`);
      } finally {
        test.client.clear();
      }
    });
  }

  for (const source of ["accounts", "iva"] as const) {
    it(`still propagates a required ${source} failure to the route`, async () => {
      const test = setup([source]);
      try {
        await assert.rejects(test.load(), new RegExp(`${source} unavailable`));
      } finally {
        test.client.clear();
      }
    });
  }

  it("loads all dashboard data when every source succeeds", async () => {
    const test = setup();
    try {
      await test.load();
      assert.equal(test.client.getQueryData(["documents"]), "documents data");
      assert.equal(test.client.getQueryData(["salary", "owner"]), "salary data");
    } finally {
      test.client.clear();
    }
  });
});
