import { JSDOM } from "jsdom";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import type { ComponentType } from "react";
import type { IvaQuarter } from "../lib/quarters";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://test.invalid" });
for (const key of [
  "window",
  "document",
  "navigator",
  "HTMLElement",
  "Element",
  "Node",
  "DocumentFragment",
  "MutationObserver",
  "Event",
  "MouseEvent",
  "getComputedStyle",
] as const)
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
Object.defineProperty(dom.window, "matchMedia", {
  value: () => ({
    matches: false,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
  }),
});
Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
});
Object.defineProperty(globalThis, "requestAnimationFrame", {
  configurable: true,
  value: (callback: FrameRequestCallback) => setTimeout(() => callback(0), 0),
});
Object.defineProperty(globalThis, "cancelAnimationFrame", {
  configurable: true,
  value: clearTimeout,
});
const React = await import("react");
const jsx = await import("react/jsx-runtime");
const query = await import("@tanstack/react-query");
const { render, cleanup, fireEvent, waitFor, act } = await import("@testing-library/react");
const quarters = await import("../lib/quarters");
const amounts = await import("../lib/amounts");
const button = await import("@/components/ui/button");
const input = await import("@/components/ui/input");
const dialog = await import("@/components/ui/dialog");
const icons = await import("lucide-react");
afterEach(async () => {
  await act(async () => cleanup());
});

const period: IvaQuarter = {
  year: 2026,
  quarter: 1,
  status: "open",
  salesCents: 23000,
  deductionsCents: 2300,
  carryInCents: 0,
  payableCents: 20700,
  carryOutCents: 0,
  governmentCents: null,
  confirmedCarryOutCents: null,
  unpaidInvoices: 0,
  previousClosed: true,
  paymentTransactionId: null,
  closedAt: null,
};
function setup(overrides: Partial<IvaQuarter> = {}) {
  const calls: unknown[] = [];
  const ledger = [
    { ...period, ...overrides },
    ...[2, 3, 4].map((quarter) => ({
      ...period,
      quarter,
      previousClosed: false,
      salesCents: 0,
      deductionsCents: 0,
      payableCents: 0,
    })),
  ];
  const options = (key: string, data: unknown) => ({
    queryKey: [key],
    queryFn: async () => data,
    staleTime: Infinity,
  });
  const server = {
    getIvaQuery: options("iva", ledger),
    closeQuarterMutation: {
      mutationFn: async (data: unknown) => {
        calls.push(data);
      },
    },
    reopenQuarterMutation: {
      mutationFn: async (data: unknown) => {
        calls.push(data);
      },
    },
  };
  const invoiceOptions = options("invoices", [
    { id: "one", name: "March sale", value: 1000, createdAt: "2026-03-31", status: "paid" },
    {
      id: "two",
      name: "April cancelled",
      value: 1000,
      createdAt: "2026-04-01",
      status: "cancelled",
    },
  ]);
  const expenseOptions = options("expenses", [
    { id: "three", title: "March expense", value: "123", iva: true, createdAt: "2026-03-31" },
  ]);
  const client = new query.QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  client.setQueryData(["iva"], ledger);
  client.setQueryData(["invoices"], awaitData(invoiceOptions));
  client.setQueryData(["expenses"], awaitData(expenseOptions));
  // Fixtures are synchronous in the cache to keep the test independent of transport.
  function awaitData(option: typeof invoiceOptions) {
    return option.queryKey[0] === "invoices"
      ? [
          { id: "one", name: "March sale", value: 1000, createdAt: "2026-03-31", status: "paid" },
          {
            id: "two",
            name: "April cancelled",
            value: 1000,
            createdAt: "2026-04-01",
            status: "cancelled",
          },
        ]
      : [{ id: "three", title: "March expense", value: "123", iva: true, createdAt: "2026-03-31" }];
  }
  const modules: Record<string, unknown> = {
    react: React,
    "react/jsx-runtime": jsx,
    "@tanstack/react-query": query,
    "lucide-react": icons,
    sonner: { toast: { success() {} } },
    "@/components/ui/button": button,
    "@/components/ui/input": input,
    "@/components/ui/dialog": dialog,
    "../lib/quarters": quarters,
    "../lib/amounts": amounts,
    "../server/functions": server,
    "@/features/accounts/lib/invalidate": { invalidateAccountData: async () => {} },
    "@/features/accounts/components/account-select": {
      AccountSelect: ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
        <label>
          Account
          <select value={value} onChange={(e) => onChange(e.target.value)}>
            <option value="">Choose</option>
            <option value="account">Bank</option>
          </select>
        </label>
      ),
    },
    "@/features/invoices/server/functions": { getInvoicesQuery: invoiceOptions },
    "@/features/expenses/server/functions": { getExpensesQuery: expenseOptions },
  };
  function load(path: string) {
    const output = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    const exports: Record<string, ComponentType<Record<string, unknown>>> = {};
    runInNewContext(output.outputText, {
      exports,
      Date,
      Intl,
      require: (name: string) => {
        if (!(name in modules)) throw new Error(`Unexpected dependency ${name}`);
        return modules[name];
      },
    });
    return exports;
  }
  const close = load("./close-quarter-dialog.tsx");
  modules["../components/close-quarter-dialog"] = close;
  const view = load("../views/iva-view.tsx");
  return {
    calls,
    period: ledger[0]!,
    Close: close.CloseQuarterDialog!,
    View: view.default!,
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <query.QueryClientProvider client={client}>{children}</query.QueryClientProvider>
    ),
  };
}

describe("IVA interface", () => {
  it("blocks mismatches and requires the account before creating a payment", async () => {
    const test = setup();
    const ui = render(<test.Close quarter={test.period} onClose={() => {}} />, {
      wrapper: test.wrapper,
    });
    const submit = ui.getByRole("button", {
      name: "Record payment and close",
    }) as HTMLButtonElement;
    assert.ok(submit.disabled);
    fireEvent.change(ui.getByLabelText("Government IVA amount (€)"), { target: { value: "208" } });
    assert.ok(ui.getByText(/Difference: €1.00/));
    assert.ok(submit.disabled);
    fireEvent.change(ui.getByLabelText("Government IVA amount (€)"), { target: { value: "207" } });
    assert.ok(submit.disabled);
    fireEvent.change(ui.getByLabelText("Account"), { target: { value: "account" } });
    fireEvent.click(submit);
    await waitFor(() => assert.equal(test.calls.length, 1));
    assert.equal((test.calls[0] as { governmentAmount: string }).governmentAmount, "207");
  });
  it("closes a zero-payment quarter without account or transaction details", async () => {
    const test = setup({ payableCents: 0, carryOutCents: 1000 });
    const ui = render(<test.Close quarter={test.period} onClose={() => {}} />, {
      wrapper: test.wrapper,
    });
    assert.equal(ui.queryByLabelText("Account"), null);
    fireEvent.change(ui.getByLabelText("Government IVA amount (€)"), { target: { value: "0" } });
    fireEvent.click(ui.getByRole("button", { name: "Close quarter" }));
    await waitFor(() => assert.equal(test.calls.length, 1));
    assert.ok(!("accountId" in (test.calls[0] as object)));
  });
  it("keeps the original government amount and requires a replacement payment when reclosing", async () => {
    const test = setup({ governmentCents: 20700, confirmedCarryOutCents: 0 });
    const ui = render(<test.Close quarter={test.period} onClose={() => {}} />, {
      wrapper: test.wrapper,
    });
    assert.ok((ui.getByLabelText("Government IVA amount (€)") as HTMLInputElement).readOnly);
    const submit = ui.getByRole("button", {
      name: "Record payment and close",
    }) as HTMLButtonElement;
    assert.ok(submit.disabled);
    fireEvent.change(ui.getByLabelText("Account"), { target: { value: "account" } });
    fireEvent.click(submit);
    await waitFor(() => assert.equal(test.calls.length, 1));
    assert.equal((test.calls[0] as { accountId: string }).accountId, "account");
  });
  it("filters document details by quarter and displays cancelled invoices as zero IVA", () => {
    const test = setup();
    const ui = render(<test.View />, { wrapper: test.wrapper });
    assert.ok(ui.getByText("March sale"));
    assert.ok(ui.getByText("April cancelled"));
    fireEvent.click(ui.getByRole("button", { name: /^Q1$/ }));
    assert.equal(ui.queryByText("April cancelled"), null);
    assert.ok(ui.getByText("March expense"));
    fireEvent.click(ui.getByRole("button", { name: /^Q2$/ }));
    assert.equal(ui.queryByText("March sale"), null);
    assert.match(ui.getByText("April cancelled").closest("tr")!.textContent!, /€0.00/);
    assert.ok((ui.getByRole("button", { name: "Close quarter" }) as HTMLButtonElement).disabled);
  });
});
