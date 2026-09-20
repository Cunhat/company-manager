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

const { DeleteSalaryDialog } = await import("./delete-salary-dialog");
afterEach(async () => {
  await act(async () => {
    cleanup();
  });
});

const noop = () => {};
describe("salary deletion confirmation", () => {
  it("requires confirmation and lets the user keep the salary", async () => {
    let calls = 0;
    render(
      <DeleteSalaryDialog
        month="2026-09"
        kind="monthly"
        disabled={false}
        onOpenChange={noop}
        onDelete={async () => {
          calls++;
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete salary" }));
    await screen.findByRole("alertdialog");
    assert.equal(calls, 0);
    assert.match(
      screen.getByRole("alertdialog").textContent ?? "",
      /Existing travel entries will be kept/,
    );
    fireEvent.click(screen.getByRole("button", { name: "Keep salary" }));
    await waitFor(() => assert.equal(screen.queryByRole("alertdialog"), null));
    assert.equal(calls, 0);
  });
  it("prevents repeat submissions and keeps errors visible for retry", async () => {
    let calls = 0;
    let fail: ((reason: Error) => void) | undefined;
    render(
      <DeleteSalaryDialog
        month="2026-09"
        kind="monthly"
        disabled={false}
        onOpenChange={noop}
        onDelete={async () => {
          calls++;
          await new Promise<void>((_, reject) => {
            fail = reject;
          });
        }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete salary" }));
    fireEvent.click(await screen.findByRole("button", { name: "Delete salary permanently" }));
    fireEvent.click(screen.getByRole("button", { name: "Deleting..." }));
    assert.equal(calls, 1);
    assert.equal(
      (screen.getByRole("button", { name: "Keep salary" }) as HTMLButtonElement).disabled,
      true,
    );
    await act(async () => {
      fail?.(new Error("This quarter is closed"));
    });
    assert.equal(screen.getByRole("alert").textContent, "This quarter is closed");
    assert.ok(screen.getByRole("alertdialog"));
    assert.equal(
      (screen.getByRole("button", { name: "Delete salary permanently" }) as HTMLButtonElement)
        .disabled,
      false,
    );
  });
  it("explains bonus deletion without promising to reopen the month", async () => {
    render(
      <DeleteSalaryDialog
        month="2026-12"
        kind="christmas"
        disabled={false}
        onOpenChange={noop}
        onDelete={async () => {}}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Delete salary" }));
    const dialog = await screen.findByRole("alertdialog");
    assert.match(dialog.textContent ?? "", /generate this bonus again/);
    assert.doesNotMatch(dialog.textContent ?? "", /month will reopen/);
  });
});
