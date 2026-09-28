import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IvaQuarter } from "../../iva/lib/quarters";
import { getNextIvaPayment } from "./next-iva-payment";

const quarter: IvaQuarter = {
  year: 2026,
  quarter: 2,
  status: "open",
  salesCents: 23000,
  pendingSalesCents: 0,
  deductionsCents: 3000,
  carryInCents: 5000,
  payableCents: 15000,
  carryOutCents: 0,
  governmentCents: null,
  confirmedCarryOutCents: null,
  previousClosed: true,
  unpaidInvoices: 0,
  paymentTransactionId: null,
  closedAt: null,
};
const today = new Date("2026-09-21T12:00:00Z");

describe("next IVA payment", () => {
  it("uses the next scheduled quarter's payable amount after deductions and carried credit", () => {
    const result = getNextIvaPayment(
      [{ ...quarter, quarter: 1, payableCents: 99900 }, quarter],
      today,
    );
    assert.equal(result.deadline.quarter, "Q2");
    assert.equal(result.period, quarter);
    assert.equal(result.payableCents, 15000);
  });

  it("advances a closed quarter to the next quarter's amount and deadlines", () => {
    const nextQuarter = { ...quarter, quarter: 3, payableCents: 42000 };
    const result = getNextIvaPayment(
      [
        { ...quarter, status: "closed", governmentCents: 15000, paymentTransactionId: "payment" },
        nextQuarter,
      ],
      today,
    );
    assert.equal(result.period, nextQuarter);
    assert.equal(result.deadline.quarter, "Q3");
    assert.equal(result.deadline.declaration.format("YYYY-MM-DD"), "2026-11-20");
    assert.equal(result.deadline.payment.format("YYYY-MM-DD"), "2026-11-25");
    assert.equal(result.deadline.daysToPay, 65);
    assert.equal(result.deadline.declarationDatePassed, false);
    assert.equal(result.payableCents, 42000);
  });

  it("skips consecutive closed quarters across the year boundary", () => {
    const nextQuarter = { ...quarter, year: 2027, quarter: 1, payableCents: 1000 };
    const result = getNextIvaPayment(
      [
        ...[2, 3, 4].map((number): IvaQuarter => ({
          ...quarter,
          quarter: number,
          status: "closed",
        })),
        nextQuarter,
      ],
      today,
    );
    assert.equal(result.period, nextQuarter);
    assert.equal(result.deadline.taxYear, 2027);
    assert.equal(result.deadline.quarter, "Q1");
    assert.equal(result.deadline.payment.format("YYYY-MM-DD"), "2027-05-25");
    assert.equal(result.payableCents, 1000);
  });

  it("shows the next scheduled quarter even when it has no ledger records yet", () => {
    const result = getNextIvaPayment([{ ...quarter, status: "closed" }], today);
    assert.equal(result.deadline.quarter, "Q3");
    assert.equal(result.period, undefined);
    assert.equal(result.payableCents, 0);
  });

  it("shows zero when deductions cover the IVA or there are no records", () => {
    assert.equal(
      getNextIvaPayment([{ ...quarter, payableCents: 0, carryOutCents: 4000 }], today).payableCents,
      0,
    );
    assert.equal(getNextIvaPayment([], today).payableCents, 0);
  });

  it("uses the previous year's fourth quarter for the payment at the start of the year", () => {
    const result = getNextIvaPayment(
      [{ ...quarter, year: 2025, quarter: 4 }, quarter],
      new Date("2026-01-15T12:00:00Z"),
    );
    assert.equal(result.deadline.taxYear, 2025);
    assert.equal(result.deadline.quarter, "Q4");
    assert.equal(result.payableCents, 15000);
  });

  it("leaves IVA on pending invoices out of the payment", () => {
    // 23000 sales, 4600 of them pending: 18400 - 3000 deductions - 5000 carried in.
    const result = getNextIvaPayment([{ ...quarter, pendingSalesCents: 4600 }], today);
    assert.equal(result.payableCents, 10400);
    assert.equal(
      getNextIvaPayment([{ ...quarter, pendingSalesCents: 23000 }], today).payableCents,
      0,
    );
  });

  it("carries credit from a quarter whose invoices are all pending", () => {
    const earlier = { ...quarter, quarter: 1, pendingSalesCents: 23000 };
    const next = { ...quarter, carryInCents: 0, payableCents: 20000 };
    // Q1 now carries 3000 deductions + 5000 incoming into Q2: 23000 - 3000 - 8000.
    assert.equal(getNextIvaPayment([earlier, next], today).payableCents, 12000);
    // A reopened quarter keeps its confirmed carryover.
    assert.equal(
      getNextIvaPayment([{ ...earlier, confirmedCarryOutCents: 0 }, next], today).payableCents,
      20000,
    );
  });

  it("keeps the payment on its deadline and advances on the following day", () => {
    const { deadline } = getNextIvaPayment([quarter], today);
    assert.equal(getNextIvaPayment([quarter], deadline.payment.toDate()).period, quarter);
    assert.equal(
      getNextIvaPayment([quarter], deadline.payment.add(1, "day").toDate()).deadline.quarter,
      "Q3",
    );
  });
});
