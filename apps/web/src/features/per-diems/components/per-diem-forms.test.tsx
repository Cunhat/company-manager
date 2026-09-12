import { JSDOM } from "jsdom";
import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { CreatePerDiem, EditPerDiem, PerDiem } from "../schemas/types";
import type { KmsJourney } from "@/features/kms/schemas/types";

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
const { AddPerDiemDialog } = await import("./add-per-diem-dialog");
const { EditPerDiemSheet } = await import("./edit-per-diem-sheet");
afterEach(async () => {
  await act(async () => {
    cleanup();
  });
});

const source: KmsJourney = {
  id: "9f1bfeba-23aa-423a-8d9b-f832a5f5a439",
  userId: "alice",
  origin: "Sede",
  destination: "Coimbra",
  reason: "Reunião com a equipa",
  isReturn: false,
  description: null,
  distance: 190,
  date: new Date("2026-08-06T00:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
};
const entry: PerDiem = {
  id: "ba8ba817-62d1-4600-b14f-ef461aef8cb1",
  userId: "alice",
  sourceJourneyId: source.id,
  description: "",
  date: "2026-08-06",
  destination: "Coimbra",
  reason: source.reason,
  type: "daily",
  territory: "portugal",
  dailyRateCents: 7265,
  percentage: 25,
  sourceOrigin: "Sede",
  sourceDistance: 190,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("per diem forms", () => {
  it("switches to the foreign manager rate and lets the user reduce the allowance for a paid hotel", async () => {
    render(
      <AddPerDiemDialog
        journeys={[source]}
        initialJourneyId={source.id}
        month="2026-08"
        onAdd={async () => {}}
        onClose={() => {}}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByLabelText("Travel location"));
    });
    await act(async () => {
      const option = screen.getByRole("option", { name: "Abroad" });
      fireEvent.pointerDown(option, { pointerType: "mouse" });
      fireEvent.click(option);
    });
    assert.equal(
      (screen.getByLabelText("Full daily rate (€)") as HTMLInputElement).value,
      "167.07",
    );
    assert.equal((screen.getByLabelText("Daily allowance (%)") as HTMLInputElement).value, "100");
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Daily allowance (%)"), { target: { value: "70" } });
    });
    await waitFor(() => assert.ok(screen.getAllByText("€116.95").length > 0));
  });
  it("prefills the selected journey, previews cents, and submits reviewed values", async () => {
    let submitted: CreatePerDiem | undefined;
    let closed = false;
    render(
      <AddPerDiemDialog
        journeys={[source]}
        initialJourneyId={source.id}
        month="2026-08"
        onAdd={async (values) => {
          submitted = values;
        }}
        onClose={() => {
          closed = true;
        }}
      />,
    );
    assert.equal(
      (screen.getByLabelText("Business destination") as HTMLInputElement).value,
      "Coimbra",
    );
    assert.equal((screen.getByLabelText("Full daily rate (€)") as HTMLInputElement).value, "72.65");
    assert.ok(screen.getAllByText("€18.16").length > 0);
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Daily allowance (%)"), { target: { value: "50" } });
    });
    await waitFor(() => assert.ok(screen.getAllByText("€36.33").length > 0));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save per diems" }));
    });
    await waitFor(() => assert.equal(submitted?.dailyPercentage, "50"));
    assert.equal(submitted?.sourceJourneyId, source.id);
    assert.equal(closed, true);
  });
  it("keeps the dialog and input after a failed save, then permits retry", async () => {
    let attempts = 0;
    render(
      <AddPerDiemDialog
        journeys={[source]}
        initialJourneyId={source.id}
        month="2026-08"
        onAdd={async () => {
          attempts++;
          throw new Error("An allowance already exists for this date.");
        }}
        onClose={() => {
          throw new Error("Must remain open");
        }}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save per diems" }));
    });
    await waitFor(() =>
      assert.match(screen.getByRole("alert").textContent ?? "", /already exists/),
    );
    assert.equal(
      (screen.getByLabelText("Business destination") as HTMLInputElement).value,
      "Coimbra",
    );
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save per diems" }));
    });
    await waitFor(() => assert.equal(attempts, 2));
  });
  it("blocks invalid percentages before submitting", async () => {
    let calls = 0;
    render(
      <AddPerDiemDialog
        journeys={[source]}
        initialJourneyId={source.id}
        month="2026-08"
        onAdd={async () => {
          calls++;
        }}
        onClose={() => {}}
      />,
    );
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Daily allowance (%)"), { target: { value: "101" } });
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save per diems" }));
    });
    await waitFor(() => assert.ok(screen.getByText("Enter a whole percentage from 0 to 100")));
    assert.equal(calls, 0);
  });
  it("edits a saved day and retains the historical full-day rate", async () => {
    let submitted: EditPerDiem | undefined;
    render(
      <EditPerDiemSheet
        entry={{ ...entry, dailyRateCents: 6000 }}
        onSave={async (values) => {
          submitted = values;
        }}
        onClose={() => {}}
      />,
    );
    assert.equal((screen.getByLabelText("Full daily rate (€)") as HTMLInputElement).value, "60.00");
    await act(async () => {
      fireEvent.change(screen.getByLabelText("Allowance (%)"), { target: { value: "75" } });
    });
    await waitFor(() => assert.ok(screen.getByText("€45.00")));
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    });
    await waitFor(() => assert.equal(submitted?.percentage, "75"));
    assert.equal(submitted?.dailyRate, "60.00");
  });
});

it("prefills the paired return and submits three days with the overnight description", async () => {
  let submitted: CreatePerDiem | undefined;
  const returning = {
    ...source,
    id: crypto.randomUUID(),
    origin: source.destination,
    destination: source.origin,
    reason: "Regresso",
    date: new Date("2026-08-08T00:00:00Z"),
  };
  render(
    <AddPerDiemDialog
      journeys={[{ ...source, returnJourney: returning }]}
      initialJourneyId={source.id}
      month="2026-08"
      onAdd={async (values) => {
        submitted = values;
      }}
      onClose={() => {}}
    />,
  );
  assert.equal((screen.getByLabelText("Description") as HTMLInputElement).value, "Com prenoita");
  assert.ok(screen.getByText("€163.46"));
  assert.ok(screen.getByText("Coimbra → Sede"));
  assert.ok(screen.getByText("Regresso"));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Save per diems" }));
  });
  await waitFor(() => assert.equal(submitted?.returnDate, "2026-08-08"));
  assert.equal(submitted?.returnJourneyId, returning.id);
  assert.equal(submitted?.description, "Com prenoita");
});
