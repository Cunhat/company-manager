import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getExpenseIvaValue } from "./expense";

describe("expense IVA", () => {
  it("extracts IVA from a gross expense amount", () => {
    assert.equal(getExpenseIvaValue({ value: "1230.00", iva: true }), 230);
  });

  it("returns zero for an expense without IVA", () => {
    assert.equal(getExpenseIvaValue({ value: "1230.00", iva: false }), 0);
  });

  it("rounds extracted IVA to cents", () => {
    assert.equal(getExpenseIvaValue({ value: "100.00", iva: true }), 18.7);
    assert.equal(getExpenseIvaValue({ value: "12.34", iva: true }), 2.31);
  });

  it("returns zero for a zero-value expense", () => {
    assert.equal(getExpenseIvaValue({ value: "0.00", iva: true }), 0);
    assert.equal(getExpenseIvaValue({ value: "0.00", iva: false }), 0);
  });
});
