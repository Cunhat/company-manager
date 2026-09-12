import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { KmsJourney } from "@/features/kms/schemas/types";
import {
  pairMileageJourneys,
  tripHasClaimedDays,
  allowanceCents,
  allowanceDays,
  perDiemsForMonth,
  perDiemsFromJourney,
  valuesFromJourney,
} from "./allowances";
import { createPerDiemSchema, editPerDiemSchema } from "../schemas/validators";

const source: KmsJourney = {
  id: "9f1bfeba-23aa-423a-8d9b-f832a5f5a439",
  userId: "alice",
  origin: "Sede",
  destination: "Coimbra",
  reason: "Reunião com equipa técnica",
  description: null,
  distance: 190,
  date: new Date("2026-08-06T00:00:00Z"),
  createdAt: new Date(),
  updatedAt: new Date(),
};
const input = () => valuesFromJourney(source, "2026-08");

describe("per diem calculations and validation", () => {
  it("uses the manager rate and rounds each day's allowance before summing", () => {
    const [day] = allowanceDays(input());
    assert.equal(day.dailyRateCents, 7265);
    assert.equal(day.percentage, 25);
    assert.equal(allowanceCents(day), 1816);
    const total =
      Array.from({ length: 6 }, () => allowanceCents(day)).reduce((a, b) => a + b, 0) + 3 * 7265;
    assert.equal(total, 32691);
  });
  it("creates one allowance for same-day outward and return travel", () => {
    const days = allowanceDays(input());
    assert.equal(days.length, 1);
    assert.equal(days[0].type, "daily");
  });
  it("includes intermediate days with overnight descriptions and a reversed return route", () => {
    const days = allowanceDays({ ...input(), returnDate: "2026-08-08" });
    assert.deepEqual(
      days.map((day) => [day.date, day.type, day.percentage]),
      [
        ["2026-08-06", "departure", 100],
        ["2026-08-07", "intermediate", 100],
        ["2026-08-08", "return", 25],
      ],
    );
    assert.deepEqual(
      days.map((day) => [day.sourceOrigin, day.destination, day.reason, day.description]),
      [
        ["Sede", "Coimbra", source.reason, "Com prenoita"],
        ["Sede", "Coimbra", source.reason, "Com prenoita"],
        ["Coimbra", "Sede", "Regresso", ""],
      ],
    );
    assert.equal(
      days.reduce((sum, day) => sum + allowanceCents(day), 0),
      16346,
    );
  });
  it("keeps user-adjusted foreign percentages and rates", () => {
    const days = allowanceDays({
      ...input(),
      territory: "abroad",
      dailyRate: "167.07",
      returnDate: "2026-08-08",
      departurePercentage: "70",
      intermediatePercentage: "40",
      returnPercentage: "20",
    });
    assert.deepEqual(days.map(allowanceCents), [11695, 6683, 3341]);
    assert.equal(allowanceCents(allowanceDays({ ...input(), dailyPercentage: "0" })[0]), 0);
  });
  it("splits a cross-year trip into the correct monthly reports", () => {
    const days = allowanceDays({
      ...input(),
      month: "2026-12",
      departureDate: "2026-12-31",
      returnDate: "2027-01-02",
    });
    assert.deepEqual(
      perDiemsForMonth(days, "2026-12").map((day) => day.type),
      ["departure"],
    );
    assert.deepEqual(
      perDiemsForMonth(days, "2027-01").map((day) => day.type),
      ["intermediate", "return"],
    );
  });
  it("handles leap days and DST transitions as calendar dates", () => {
    const leap = allowanceDays({
      ...input(),
      month: "2028-02",
      departureDate: "2028-02-28",
      returnDate: "2028-03-01",
    });
    assert.deepEqual(
      leap.map((day) => day.date),
      ["2028-02-28", "2028-02-29", "2028-03-01"],
    );
    const dst = allowanceDays({
      ...input(),
      month: "2026-03",
      departureDate: "2026-03-28",
      returnDate: "2026-03-30",
    });
    assert.equal(dst.length, 3);
  });
  it("rejects invalid dates, reversed ranges, wrong months, and more than 90 days", () => {
    for (const change of [
      { departureDate: "2026-02-30" },
      { returnDate: "2026-08-05" },
      { month: "2026-09" },
      { returnDate: "2027-01-01" },
      { month: "2026-13" },
    ]) {
      assert.equal(createPerDiemSchema.safeParse({ ...input(), ...change }).success, false);
    }
  });
  it("rejects malformed, non-finite and out-of-range rates and percentages", () => {
    for (const dailyRate of ["", "0", "-1", "NaN", "Infinity", "72.651", "10001", "1e2"]) {
      assert.equal(
        createPerDiemSchema.safeParse({ ...input(), dailyRate }).success,
        false,
        dailyRate,
      );
    }
    for (const dailyPercentage of ["", "-1", "101", "25.5", "NaN", "Infinity"]) {
      assert.equal(
        createPerDiemSchema.safeParse({ ...input(), dailyPercentage }).success,
        false,
        dailyPercentage,
      );
    }
  });
  it("requires a source UUID, destination and business purpose", () => {
    for (const change of [{ sourceJourneyId: "bad-id" }, { destination: " " }, { reason: " " }]) {
      assert.equal(createPerDiemSchema.safeParse({ ...input(), ...change }).success, false);
    }
  });
  it("binds source snapshots to the signed-in owner and the original journey date", () => {
    const [day] = perDiemsFromJourney(input(), source, "alice");
    assert.equal(day.userId, "alice");
    assert.equal(day.sourceJourneyId, source.id);
    assert.equal(day.sourceDistance, 190);
    assert.throws(() => perDiemsFromJourney(input(), source, "bob"), /not found/);
    assert.throws(
      () =>
        perDiemsFromJourney({ ...input(), sourceJourneyId: crypto.randomUUID() }, source, "alice"),
      /not found/,
    );
    assert.throws(
      () =>
        perDiemsFromJourney(
          { ...input(), departureDate: "2026-08-07", returnDate: "2026-08-07" },
          source,
          "alice",
        ),
      /must match/,
    );
  });
  it("validates edits independently of the source and supports intermediate-day corrections", () => {
    const value = {
      origin: "Sede",
      description: "Com prenoita",
      date: "2026-08-07",
      destination: "Coimbra",
      reason: "Trabalho no cliente",
      territory: "portugal",
      dailyRate: "72.65",
      type: "intermediate",
      percentage: "50",
    };
    assert.equal(editPerDiemSchema.safeParse(value).success, true);
    assert.equal(editPerDiemSchema.safeParse({ ...value, type: "invalid" }).success, false);
    assert.equal(editPerDiemSchema.safeParse({ ...value, date: "2026-02-30" }).success, false);
  });
});

describe("mileage trip pairing", () => {
  const leg = (date: string, returning = false, changes: Partial<KmsJourney> = {}): KmsJourney => ({
    ...source,
    id: crypto.randomUUID(),
    date: new Date(`${date}T00:00:00Z`),
    origin: returning ? source.destination : source.origin,
    destination: returning ? source.origin : source.destination,
    reason: returning ? "Regresso" : source.reason,
    ...changes,
  });
  it("pairs unordered legs and automatically fills every overnight day", () => {
    const returning = leg("2026-08-08", true);
    const [trip] = pairMileageJourneys([returning, source]);
    assert.equal(trip.id, source.id);
    assert.equal(trip.returnJourney?.id, returning.id);
    const values = valuesFromJourney(trip, "2026-08");
    assert.equal(values.returnDate, "2026-08-08");
    const rows = perDiemsFromJourney(values, source, "alice", returning);
    assert.deepEqual(rows.map(allowanceCents), [7265, 7265, 1816]);
    assert.deepEqual(
      rows.map((row) => row.description),
      ["Com prenoita", "Com prenoita", ""],
    );
    assert.equal(rows[2].sourceJourneyId, returning.id);
    assert.equal(rows[2].destination, "Sede");
  });
  it("groups a same-day return into one daily allowance", () => {
    const trips = pairMileageJourneys([leg("2026-08-06", true), source]);
    assert.equal(trips.length, 1);
    const days = allowanceDays(valuesFromJourney(trips[0], "2026-08"));
    assert.equal(days.length, 1);
    assert.equal(days[0].description, "");
    assert.equal(days[0].type, "daily");
  });
  it("pairs repeated routes separately and supports legacy return purposes", () => {
    const trips = pairMileageJourneys([
      source,
      leg("2026-08-08", true, { reason: source.reason }),
      leg("2026-08-10"),
      leg("2026-08-12", true),
    ]);
    assert.equal(trips.length, 2);
    assert.deepEqual(
      trips.map((trip) => valuesFromJourney(trip, "2026-08").returnDate),
      ["2026-08-08", "2026-08-12"],
    );
  });
  it("does not borrow another owner's return or skip the next outward trip", () => {
    const trips = pairMileageJourneys([
      source,
      leg("2026-08-07"),
      leg("2026-08-08", true),
      leg("2026-08-06", true, { userId: "bob" }),
    ]);
    assert.equal(trips.length, 2);
    assert.equal(trips[0].returnJourney, undefined);
    assert.ok(trips[1].returnJourney);
    assert.deepEqual(pairMileageJourneys([leg("2026-08-08", true)]), []);
  });
  it("pairs across month boundaries and rejects stale or forged return references", () => {
    const outward = leg("2026-08-31");
    const returning = leg("2026-09-02", true);
    const [trip] = pairMileageJourneys([outward, returning]);
    const values = valuesFromJourney(trip, "2026-08");
    assert.equal(perDiemsForMonth(allowanceDays(values), "2026-09").length, 2);
    assert.throws(() => perDiemsFromJourney(values, outward, "alice"), /return journey/);
    assert.throws(
      () => perDiemsFromJourney(values, outward, "alice", { ...returning, userId: "bob" }),
      /return journey/,
    );
    assert.throws(
      () =>
        perDiemsFromJourney({ ...values, returnDate: "2026-09-03" }, outward, "alice", returning),
      /return journey/,
    );
    assert.throws(
      () => perDiemsFromJourney(values, outward, "alice", { ...returning, origin: "Other" }),
      /return journey/,
    );
  });
});

it("blocks a trip when an intermediate day is already claimed", () => {
  const trip = { ...source, returnJourney: { ...source, date: new Date("2026-08-08T00:00:00Z") } };
  assert.equal(tripHasClaimedDays(trip, new Set(["2026-08-07"])), true);
  assert.equal(tripHasClaimedDays(trip, new Set(["2026-08-09"])), false);
});
