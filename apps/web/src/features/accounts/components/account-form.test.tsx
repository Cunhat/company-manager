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

const { AccountForm } = await import("./account-form");
afterEach(async () => {
  await act(async () => {
    cleanup();
  });
});

const defaults = { name: "Bank", description: "", openingBalance: "0" };
const noop = () => {};

describe("account form", () => {
  it("submits the entered opening balance including cents", async () => {
    let saved: typeof defaults | undefined;
    render(
      <AccountForm
        mode="create"
        defaultValues={defaults}
        onSubmit={async (values) => {
          saved = values;
        }}
        onCancel={noop}
        onSubmittingChange={noop}
      />,
    );
    fireEvent.change(screen.getByLabelText("Opening balance (€)"), { target: { value: "-10.25" } });
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => assert.equal(saved?.openingBalance, "-10.25"));
  });

  it("keeps failed saves open and shows the server error", async () => {
    render(
      <AccountForm
        mode="create"
        defaultValues={defaults}
        onSubmit={async () => {
          throw new Error("Account could not be saved");
        }}
        onCancel={noop}
        onSubmittingChange={noop}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() =>
      assert.match(screen.getByRole("alert").textContent ?? "", /Account could not be saved/),
    );
    assert.equal((screen.getByLabelText("Name") as HTMLInputElement).value, "Bank");
  });

  it("rejects an amount with fractional cents", async () => {
    let saves = 0;
    render(
      <AccountForm
        mode="create"
        defaultValues={{ ...defaults, openingBalance: "1.001" }}
        onSubmit={async () => {
          saves++;
        }}
        onCancel={noop}
        onSubmittingChange={noop}
      />,
    );
    const button = screen.getByRole("button", { name: "Create account" });
    fireEvent.submit(button.closest("form")!);
    await waitFor(() =>
      assert.ok(screen.getByText("Enter an amount with up to two decimal places")),
    );
    assert.equal(saves, 0);
  });

  it("prevents duplicate submissions while a save is pending", async () => {
    let saves = 0;
    let finish!: () => void;
    const pending = new Promise<void>((resolve) => {
      finish = resolve;
    });
    render(
      <AccountForm
        mode="create"
        defaultValues={defaults}
        onSubmit={async () => {
          saves++;
          await pending;
        }}
        onCancel={noop}
        onSubmittingChange={noop}
      />,
    );
    const form = screen.getByRole("button", { name: "Create account" }).closest("form")!;
    fireEvent.submit(form);
    await waitFor(() => assert.equal(saves, 1));
    fireEvent.submit(form);
    assert.equal(saves, 1);
    await act(async () => {
      finish();
    });
  });
});
