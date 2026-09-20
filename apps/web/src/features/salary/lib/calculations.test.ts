import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateSalary, DEFAULT_VALUES } from "./calculations";
import { generatePayrollSchema, salaryValuesSchema } from "../schemas/validators";

const travel = { perDiemCents: 32691, mileageCents: 54896, kilometres: 1372, perDiemDays: 7 };
describe("payroll calculations", () => {
  it("matches the accountant's receipt with its exact IRS amount and adds employer TSU", () => {
    const result = calculateSalary(
      { ...DEFAULT_VALUES, irsOverrideCents: 22800 },
      "monthly",
      travel,
    );
    assert.equal(result.ssCents, 19250);
    assert.equal(result.irsCents, 22800);
    assert.equal(result.tsuCents, 41563);
    assert.equal(result.netSalaryCents, 132950);
    assert.equal(result.netCents, 233537);
    assert.equal(result.socialSecurityCents, 60813);
    assert.equal(result.companyCents, 317150);
    assert.equal(
      result.netCents + result.socialSecurityCents + result.irsCents,
      result.companyCents,
    );
  });
  it("rounds each contribution once in cents", () => {
    assert.equal(calculateSalary(DEFAULT_VALUES).irsCents, 22803);
    assert.equal(
      calculateSalary({ ...DEFAULT_VALUES, grossCents: 10000, tsuRate: 2375 }).tsuCents,
      2375,
    );
  });
  for (const kind of ["holiday", "christmas"] as const)
    it(`${kind} ignores every allowance`, () => {
      const result = calculateSalary(DEFAULT_VALUES, kind, travel);
      assert.equal(result.mealCents + result.perDiemCents + result.mileageCents, 0);
      assert.equal(result.netCents, 132947);
      assert.equal(result.companyCents, 216563);
    });
  it("validates deductions and preserves the original input during simulations", () => {
    const original = { ...DEFAULT_VALUES };
    calculateSalary({ ...original, grossCents: 250000 }, "monthly", travel);
    assert.deepEqual(original, DEFAULT_VALUES);
    assert.equal(salaryValuesSchema.safeParse({ ...original, irsRate: 9500 }).success, false);
    assert.equal(
      salaryValuesSchema.safeParse({ ...original, irsOverrideCents: 170000 }).success,
      false,
    );
    assert.equal(salaryValuesSchema.safeParse({ ...original, grossCents: -1 }).success, false);
    assert.equal(salaryValuesSchema.safeParse({ ...original, ssRate: 11.5 }).success, false);
    assert.equal(
      generatePayrollSchema.safeParse({
        month: "2026-13",
        kind: "monthly",
        values: original,
        expected: travel,
      }).success,
      false,
    );
  });
  it("balances cash outflow for every supported rate including zero withholding", () => {
    for (const grossCents of [1, 99, 175000, 100000000])
      for (const irsRate of [0, 1303, 1350, 8900]) {
        const result = calculateSalary(
          { ...DEFAULT_VALUES, grossCents, irsRate },
          "monthly",
          travel,
        );
        assert.equal(
          result.netCents + result.socialSecurityCents + result.irsCents,
          result.companyCents,
        );
      }
  });
});
