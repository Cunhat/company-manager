import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { cents, closeBlocker, periodOf, type IvaQuarter } from "./quarters";
import { invoiceIvaCents, expenseIvaCents } from "./amounts";
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
describe("IVA form validation", () => {
  it("parses euros exactly and rejects negative, fractional-cent and excessive amounts", () => {
    assert.equal(cents("207.01"), 20701);
    assert.equal(cents("0"), 0);
    assert.equal(cents("1.1"), 110);
    for (const amount of ["", "-1", "1.001", "1e3", "NaN", "1000000000000"])
      assert.equal(cents(amount), null);
  });
  it("uses document dates at quarter and year boundaries", () => {
    assert.deepEqual(periodOf("2025-03-31"), { year: 2025, quarter: 1 });
    assert.deepEqual(periodOf("2025-04-01"), { year: 2025, quarter: 2 });
    assert.deepEqual(periodOf("2026-01-01"), { year: 2026, quarter: 1 });
  });
  it("requires previous quarters and paid invoices", () => {
    assert.equal(closeBlocker(period), null);
    assert.match(closeBlocker({ ...period, previousClosed: false })!, /earlier/);
    assert.match(closeBlocker({ ...period, unpaidInvoices: 2 })!, /2 unpaid/);
    assert.match(closeBlocker({ ...period, status: "closed" })!, /already closed/);
  });
  it("requires both original values when closing a reopened quarter", () => {
    assert.match(closeBlocker({ ...period, governmentCents: 20000 })!, /government/);
    assert.match(
      closeBlocker({ ...period, governmentCents: 20700, confirmedCarryOutCents: 100 })!,
      /carried forward/,
    );
    assert.equal(
      closeBlocker({ ...period, governmentCents: 20700, confirmedCarryOutCents: 0 }),
      null,
    );
  });
});

it("rounds each document using exact cents", () => {
  assert.equal(invoiceIvaCents("1.50"), 35);
  assert.equal(invoiceIvaCents("0.03"), 1);
  assert.equal(invoiceIvaCents("1000"), 23000);
  assert.equal(expenseIvaCents("123", true), 2300);
  assert.equal(expenseIvaCents("10", true), 187);
  assert.equal(expenseIvaCents("123", false), 0);
});
