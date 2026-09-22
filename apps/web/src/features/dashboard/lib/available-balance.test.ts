import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { availableAfterNextPayments, getNextPayrollReserve } from "./available-balance";

const now = new Date("2026-09-22T12:00:00Z");
const settings = {
  grossCents: 175000,
  mealCents: 13000,
  ssRate: 1100,
  tsuRate: 2375,
  irsRate: 1303,
};
const september = {
  id: "september",
  month: "2026-09",
  kind: "monthly",
  netCents: 149697,
  mealCents: 13000,
  perDiemCents: 0,
  mileageCents: 0,
  ssCents: 19250,
  tsuCents: 41563,
  irsCents: 22803,
};
const holiday = {
  ...september,
  id: "holiday",
  kind: "holiday",
  netCents: 132947,
  mealCents: 0,
};

describe("balance after next payments", () => {
  it("reserves the unpaid salary transfer and both payroll taxes once", () => {
    const reserve = getNextPayrollReserve(
      {
        settings,
        records: [september],
        payments: [],
      },
      now,
    );
    assert.deepEqual(reserve, {
      month: "2026-09",
      estimated: false,
      netSalaryCents: 136697,
      mealCents: 13000,
      perDiemCents: 0,
      mileageCents: 0,
      socialSecurityCents: 60813,
      irsCents: 22803,
      totalCents: 233313,
    });
    assert.equal(availableAfterNextPayments(1_000_000, 150_000, reserve.totalCents), 616687);
  });

  it("does not reserve a transfer already reflected in the current balance", () => {
    const reserve = getNextPayrollReserve(
      {
        settings,
        records: [september],
        payments: [{ recordId: september.id, kind: "salary" }],
      },
      now,
    );
    assert.equal(reserve?.netSalaryCents, 0);
    assert.equal(reserve?.mealCents, 0);
    assert.equal(reserve?.totalCents, 83616);
  });

  it("estimates the next monthly salary when payroll has not been generated", () => {
    const reserve = getNextPayrollReserve({ settings, records: [], payments: [] }, now);
    assert.equal(reserve?.month, "2026-09");
    assert.equal(reserve?.estimated, true);
    assert.equal(reserve?.netSalaryCents, 132947);
    assert.equal(reserve?.mealCents, 13000);
    assert.equal(reserve?.totalCents, 229563);
  });

  it("adds current per diems and mileage to the ungenerated monthly estimate", () => {
    const reserve = getNextPayrollReserve({ settings, records: [], payments: [] }, now, {
      perDiemCents: 9081,
      mileageCents: 8800,
      perDiemDays: 2,
      kilometres: 220,
    });
    assert.equal(reserve?.netSalaryCents, 132947);
    assert.equal(reserve?.mealCents, 13000);
    assert.equal(reserve?.perDiemCents, 9081);
    assert.equal(reserve?.mileageCents, 8800);
    assert.equal(reserve?.totalCents, 247444);
    assert.equal(availableAfterNextPayments(1_000_000, 150_000, reserve!.totalCents), 602556);
  });

  it("shows saved payroll travel once, and removes it after the salary transfer is paid", () => {
    const record = { ...september, netCents: 167578, perDiemCents: 9081, mileageCents: 8800 };
    const unpaid = getNextPayrollReserve({ settings, records: [record], payments: [] }, now);
    assert.equal(unpaid?.netSalaryCents, 136697);
    assert.equal(unpaid?.mealCents, 13000);
    assert.equal(unpaid?.perDiemCents, 9081);
    assert.equal(unpaid?.mileageCents, 8800);
    assert.equal(unpaid?.totalCents, 251194);

    const paid = getNextPayrollReserve(
      { settings, records: [record], payments: [{ recordId: record.id, kind: "salary" }] },
      now,
    );
    assert.equal(paid?.netSalaryCents, 0);
    assert.equal(paid?.mealCents, 0);
    assert.equal(paid?.perDiemCents, 0);
    assert.equal(paid?.mileageCents, 0);
    assert.equal(paid?.totalCents, 83616);
  });

  it("includes an unpaid bonus alongside the estimated monthly salary", () => {
    const reserve = getNextPayrollReserve(
      {
        settings,
        records: [holiday],
        payments: [{ recordId: holiday.id, kind: "salary" }],
      },
      now,
    );
    assert.equal(reserve?.estimated, true);
    assert.equal(reserve?.netSalaryCents, 132947);
    assert.equal(reserve?.mealCents, 13000);
    assert.equal(reserve?.socialSecurityCents, 121626);
    assert.equal(reserve?.irsCents, 45606);
  });

  it("uses the oldest unpaid payroll, including bonuses in the same month", () => {
    const reserve = getNextPayrollReserve(
      {
        settings,
        records: [
          september,
          { ...september, id: "august", month: "2026-08" },
          { ...holiday, id: "august-bonus", month: "2026-08" },
        ],
        payments: [],
      },
      now,
    );
    assert.equal(reserve?.month, "2026-08");
    assert.equal(reserve?.mealCents, 13000);
    assert.equal(reserve?.totalCents, 449876);
  });

  it("moves to the following month after this month's payroll is paid", () => {
    const reserve = getNextPayrollReserve(
      {
        settings,
        records: [september],
        payments: (["salary", "ss", "irs"] as const).map((kind) => ({
          recordId: september.id,
          kind,
        })),
      },
      now,
    );
    assert.equal(reserve?.month, "2026-10");
    assert.equal(reserve?.estimated, true);
  });

  it("returns no usable balance estimate when salary is not configured", () => {
    assert.equal(getNextPayrollReserve({ settings: null, records: [], payments: [] }, now), null);
    assert.equal(availableAfterNextPayments(10_000, 15_000, 0), -5_000);
  });
});
