import { JSDOM } from "jsdom";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
// Component tests use an isolated DOM; no app server, account, or database is accessed.
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
] as const) {
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
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

const { act, cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");

const { SalaryEditor } = await import("./salary-editor");
const { DEFAULT_VALUES, NO_TRAVEL } = await import("../lib/calculations");
afterEach(async () => {
  await act(async () => {
    cleanup();
  });
});

describe("salary simulations", () => {
  it("recalculates locally and saves only after Apply changes", async () => {
    const saved: unknown[] = [];
    render(
      <SalaryEditor
        initial={DEFAULT_VALUES}
        kind="monthly"
        travel={NO_TRAVEL}
        action="Apply changes"
        onSave={async (values) => {
          saved.push(values);
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Gross salary (€)"), { target: { value: "2000" } });
    assert.equal(saved.length, 0);
    assert.ok(screen.getByText("€1,649.40"));
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    await waitFor(() => assert.equal(saved.length, 1));
    assert.equal((saved[0] as { grossCents: number }).grossCents, 200000);
    assert.equal(DEFAULT_VALUES.grossCents, 175000);
  });
  it("accepts the accountant's exact IRS amount and comma decimals", async () => {
    let saved: { irsOverrideCents: number | null; mealCents: number } | undefined;
    render(
      <SalaryEditor
        initial={DEFAULT_VALUES}
        kind="monthly"
        travel={NO_TRAVEL}
        action="Apply changes"
        onSave={async (values) => {
          saved = values;
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText(/IRS amount override/), { target: { value: "228,00" } });
    fireEvent.change(screen.getByLabelText("Meal allowance (€)"), { target: { value: "130,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    await waitFor(() => assert.equal(saved?.irsOverrideCents, 22800));
    assert.equal(saved?.mealCents, 13050);
  });
  it("excludes meal allowance from bonus inputs and saved values", async () => {
    let saved: { mealCents: number } | undefined;
    render(
      <SalaryEditor
        initial={DEFAULT_VALUES}
        kind="holiday"
        travel={{ ...NO_TRAVEL, perDiemCents: 10000 }}
        action="Generate bonus"
        onSave={async (values) => {
          saved = values;
        }}
      />,
    );
    assert.equal(screen.queryByLabelText("Meal allowance (€)"), null);
    assert.equal(screen.queryByText(/Per diems/), null);
    fireEvent.click(screen.getByRole("button", { name: "Generate bonus" }));
    await waitFor(() => assert.equal(saved?.mealCents, 0));
  });
  it("blocks invalid rates and duplicate submissions while saving", async () => {
    let calls = 0;
    let finish: (() => void) | undefined;
    render(
      <SalaryEditor
        initial={DEFAULT_VALUES}
        kind="monthly"
        travel={NO_TRAVEL}
        action="Apply changes"
        onSave={async () => {
          calls++;
          await new Promise<void>((resolve) => {
            finish = resolve;
          });
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("IRS withholding (%)"), { target: { value: "95" } });
    assert.equal(
      (screen.getByRole("button", { name: "Apply changes" }) as HTMLButtonElement).disabled,
      true,
    );
    fireEvent.change(screen.getByLabelText("IRS withholding (%)"), { target: { value: "13.03" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    fireEvent.click(screen.getByRole("button", { name: "Saving..." }));
    assert.equal(calls, 1);
    await act(async () => finish?.());
  });
  it("shows server errors without losing the simulation", async () => {
    render(
      <SalaryEditor
        initial={DEFAULT_VALUES}
        kind="monthly"
        travel={NO_TRAVEL}
        action="Apply changes"
        onSave={async () => {
          throw new Error("The quarter is closed");
        }}
      />,
    );
    fireEvent.change(screen.getByLabelText("Gross salary (€)"), { target: { value: "2100" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply changes" }));
    await waitFor(() =>
      assert.equal(screen.getByRole("alert").textContent, "The quarter is closed"),
    );
    assert.equal((screen.getByLabelText("Gross salary (€)") as HTMLInputElement).value, "2100");
  });
});
