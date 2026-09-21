import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { calculateAnnualProfit, estimateIrc, type AnnualProfitInput } from "./annual-profit";

const now = new Date("2026-06-30T12:00:00Z");
const empty: AnnualProfitInput = { invoices: [], expenses: [], records: [], payments: [] };
const record = { id: "salary", month: "2026-06", netCents: 150000, companyCents: 250000 };

describe("annual personal profit", () => {
  it("deducts full payroll once, then adds only net salary received to profit after taxes", () => {
    const result = calculateAnnualProfit(
      {
        invoices: [{ value: 10000, status: "paid", createdAt: "2026-06-01" }],
        expenses: [
          { id: "office", value: "1230", iva: true, createdAt: "2026-06-02" },
          { id: "salary-transfer", value: "1500", iva: false, createdAt: "2026-06-28" },
        ],
        records: [record],
        payments: [
          {
            recordId: record.id,
            kind: "salary",
            expenseId: "salary-transfer",
            paidAt: "2026-06-28",
          },
        ],
      },
      now,
    );
    assert.equal(result.actual.expensesCents, 100000);
    assert.equal(result.actual.payrollCents, 250000);
    assert.equal(result.actual.profitCents, 650000);
    assert.equal(result.actual.ircCents, 97500);
    assert.equal(result.actual.dividendIrsCents, 154700);
    assert.equal(result.actual.netDividendCents, 397800);
    assert.equal(result.actual.salaryReceivedCents, 150000);
    assert.equal(result.actual.personalTotalCents, 547800);
  });

  it("excludes pending, cancelled, future and previous-year documents", () => {
    const result = calculateAnnualProfit(
      {
        ...empty,
        invoices: [
          { value: 100, status: "paid", createdAt: "2026-06-30" },
          { value: 1000, status: "pending", createdAt: "2026-01-01" },
          { value: 1000, status: "cancelled", createdAt: "2026-01-01" },
          { value: 1000, status: "paid", createdAt: "2026-07-01" },
          { value: 1000, status: "paid", createdAt: "2025-12-31" },
        ],
        expenses: [
          { id: "future", value: "1000", iva: false, createdAt: "2026-07-01" },
          { id: "old", value: "1000", iva: false, createdAt: "2025-12-31" },
        ],
        records: [
          { ...record, month: "2026-07" },
          { ...record, id: "old", month: "2025-12" },
        ],
      },
      now,
    );
    assert.equal(result.actual.revenueCents, 10000);
    assert.equal(result.actual.expensesCents, 0);
    assert.equal(result.actual.payrollCents, 0);
  });

  it("includes generated payroll costs but counts salary only when a personal transfer is paid", () => {
    const result = calculateAnnualProfit(
      {
        ...empty,
        records: [record, { ...record, id: "second" }],
        payments: [
          { recordId: record.id, kind: "ss", expenseId: null, paidAt: "2026-06-01" },
          { recordId: record.id, kind: "irs", expenseId: null, paidAt: "2026-06-01" },
          { recordId: "second", kind: "salary", expenseId: "future", paidAt: "2026-07-01" },
        ],
      },
      now,
    );
    assert.equal(result.actual.payrollCents, 500000);
    assert.equal(result.actual.salaryReceivedCents, 0);
    assert.equal(result.actual.profitCents, -500000);
  });

  it("uses payment dates for personal salary and payroll months for company costs", () => {
    const result = calculateAnnualProfit(
      {
        ...empty,
        expenses: [{ id: "transfer", value: "1500", iva: false, createdAt: "2026-01-02" }],
        records: [{ ...record, month: "2025-12" }],
        payments: [
          { recordId: record.id, kind: "salary", expenseId: "transfer", paidAt: "2026-01-02" },
        ],
      },
      now,
    );
    assert.equal(result.actual.salaryReceivedCents, 150000);
    assert.equal(result.actual.payrollCents, 0);
    assert.equal(result.actual.expensesCents, 0);
  });

  it("preserves company losses and never creates negative tax or distributable profit", () => {
    const result = calculateAnnualProfit(
      {
        ...empty,
        records: [record],
        payments: [
          { recordId: record.id, kind: "salary", expenseId: "transfer", paidAt: "2026-06-01" },
        ],
      },
      now,
    );
    assert.equal(result.actual.profitCents, -250000);
    assert.equal(result.actual.ircCents, 0);
    assert.equal(result.actual.dividendIrsCents, 0);
    assert.equal(result.actual.netDividendCents, 0);
    assert.equal(result.actual.personalTotalCents, 150000);
  });

  it("applies both IRC bands to profit actually earned so far", () => {
    const result = calculateAnnualProfit(
      {
        ...empty,
        invoices: [{ value: 80000, status: "paid", createdAt: "2026-06-01" }],
      },
      now,
    );
    assert.equal(result.actual.profitCents, 8000000);
    assert.equal(result.actual.ircCents, 1320000);
  });

  it("keeps the same totals as time passes without new activity", () => {
    const input = { ...empty, invoices: [{ value: 100, status: "paid", createdAt: "2026-01-01" }] };
    const midYear = calculateAnnualProfit(input, new Date("2026-04-15T12:00:00Z"));
    const yearEnd = calculateAnnualProfit(input, new Date("2026-12-31T12:00:00Z"));
    assert.deepEqual(midYear.actual, yearEnd.actual);
    assert.equal(midYear.actual.revenueCents, 10000);
  });

  it("returns zero totals for an empty history", () => {
    const result = calculateAnnualProfit(empty, now);
    assert.equal(result.hasActivity, false);
    assert.equal(result.actual.personalTotalCents, 0);
    assert.equal(result.actual.afterIrcCents, 0);
  });

  it("uses the current year in Portugal around midnight at the new year", () => {
    assert.equal(calculateAnnualProfit(empty, new Date("2027-01-01T00:00:00Z")).year, 2027);
    assert.equal(estimateIrc(6000000, 2026), 940000);
    assert.equal(estimateIrc(6000000, 2027), 930000);
    assert.equal(estimateIrc(6000000, 2028), 920000);
  });
});
