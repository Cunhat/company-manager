import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildBalanceTrend } from "./balance-trend";

describe("balance trend", () => {
  it("reconstructs six months of closing balances from the current balance", () => {
    const trend = buildBalanceTrend(
      125_000,
      [
        { month: "2026-04", changeCents: 50_000 },
        { month: "2026-06", changeCents: -20_000 },
        { month: "2026-09", changeCents: 10_000 },
      ],
      new Date("2026-09-22T12:00:00Z"),
    );
    assert.deepEqual(trend.points, [
      { month: "2026-03", balanceCents: 85_000 },
      { month: "2026-04", balanceCents: 135_000 },
      { month: "2026-05", balanceCents: 135_000 },
      { month: "2026-06", balanceCents: 115_000 },
      { month: "2026-07", balanceCents: 115_000 },
      { month: "2026-08", balanceCents: 115_000 },
      { month: "2026-09", balanceCents: 125_000 },
    ]);
    assert.equal(trend.changeCents, 40_000);
    assert.equal(trend.hasMovement, true);
  });

  it("keeps a flat chart when there were no recorded changes", () => {
    const trend = buildBalanceTrend(8_000, [], new Date("2026-09-22T12:00:00Z"));
    assert.equal(trend.points.length, 7);
    assert.ok(trend.points.every((point) => point.balanceCents === 8_000));
    assert.equal(trend.hasMovement, false);
  });

  it("crosses the year boundary and shows movement even if net change is zero", () => {
    const trend = buildBalanceTrend(
      -5_000,
      [
        { month: "2025-11", changeCents: 10_000 },
        { month: "2026-01", changeCents: -10_000 },
      ],
      new Date("2026-02-10T12:00:00Z"),
    );
    assert.equal(trend.points[0]?.month, "2025-08");
    assert.equal(trend.points.at(-1)?.month, "2026-02");
    assert.equal(trend.points.at(-1)?.balanceCents, -5_000);
    assert.equal(trend.changeCents, 0);
    assert.equal(trend.hasMovement, true);
  });
});
