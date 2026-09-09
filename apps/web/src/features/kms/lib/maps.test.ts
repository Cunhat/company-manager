import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { entriesForMonth, generateMonthlyMap, nightsBetween, returnAfterNights } from "./maps";
import { journeyMonthRange, journeysFromPath } from "./journeys";
import {
  createKmsPathSchema,
  createKmsTripSchema,
  monthSchema,
  tripDatesSchema,
} from "../schemas/validators";
import type { KmsJourney } from "../schemas/types";

const path = {
  origin: "Sede",
  destination: "Porto",
  reason: "Client meeting",
  distance: 137,
  description: "Bring the project documents",
};

function savedTrip(departureDate = "2026-09-07", returnDate = departureDate): KmsJourney[] {
  return journeysFromPath(path, { departureDate, returnDate }, "alice").map((values) => ({
    ...values,
    id: crypto.randomUUID(),
    description: values.description ?? null,
    createdAt: new Date("2026-09-09T12:00:00Z"),
    updatedAt: new Date("2026-09-09T12:00:00Z"),
  }));
}

describe("database journey maps", () => {
  it("snapshots both directions, purpose, distance and notes from the saved path", () => {
    const journeys = savedTrip();
    assert.deepEqual(
      journeys.map(({ origin, destination }) => [origin, destination]),
      [
        ["Sede", "Porto"],
        ["Porto", "Sede"],
      ],
    );
    for (const journey of journeys) {
      assert.equal(journey.userId, "alice");
      assert.equal(journey.description, path.description);
      assert.equal(journey.reason, path.reason);
      assert.equal(journey.distance, 137);
    }
    const result = generateMonthlyMap(journeys, "2026-09");
    assert.equal(result.entries.length, 2);
    assert.equal(result.totalKilometres, 274);
    assert.equal(result.totalAmountCents, 10960);
    assert.equal(result.ratePerKm, 0.4);
  });

  it("keeps repeated paths as distinct journeys and sorts travel dates", () => {
    const result = generateMonthlyMap(
      [...savedTrip(), ...savedTrip("2026-09-05", "2026-09-06")],
      "2026-09",
    );
    assert.equal(new Set(result.entries.map((entry) => entry.id)).size, 4);
    assert.deepEqual(
      result.entries.map((entry) => entry.date),
      ["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-07"],
    );
    assert.equal(result.totalKilometres, 548);
    assert.equal(result.totalAmountCents, 21920);
  });

  it("splits months and years by travel date, independently of creation date", () => {
    const crossMonth = savedTrip("2026-09-30", "2026-10-02");
    assert.equal(generateMonthlyMap(crossMonth, "2026-09").totalAmountCents, 5480);
    const october = entriesForMonth(crossMonth, "2026-10");
    assert.equal(october.length, 1);
    assert.equal(october[0].origin, "Porto");
    const crossYear = savedTrip("2026-12-31", "2027-01-02");
    assert.equal(entriesForMonth(crossYear, "2026-12").length, 1);
    assert.equal(entriesForMonth(crossYear, "2027-01").length, 1);
    assert.equal(entriesForMonth(crossYear, "2027-02").length, 0);
  });

  it("does not reconstruct a deleted journey from its surviving return leg", () => {
    const journeys = savedTrip();
    const result = generateMonthlyMap(journeys.slice(1), "2026-09");
    assert.equal(result.entries.length, 1);
    assert.equal(result.entries[0].id, journeys[1].id);
    assert.equal(result.totalKilometres, 137);
  });

  it("uses UTC month boundaries including leap years and year rollover", () => {
    const december = journeyMonthRange("2026-12");
    assert.equal(december.start.toISOString(), "2026-12-01T00:00:00.000Z");
    assert.equal(december.end.toISOString(), "2027-01-01T00:00:00.000Z");
    const february = journeyMonthRange("2028-02");
    assert.equal((february.end.getTime() - february.start.getTime()) / 86400000, 29);
    assert.throws(() => journeyMonthRange("2026-13"));
  });

  it("keeps distance unchanged for longer stays and handles calendar nights", () => {
    assert.equal(
      generateMonthlyMap(savedTrip("2026-09-07", "2026-09-15"), "2026-09").totalKilometres,
      274,
    );
    assert.equal(nightsBetween("2026-03-28", "2026-03-30"), 2);
    assert.equal(returnAfterNights("2026-03-28", 2), "2026-03-30");
    assert.equal(returnAfterNights("2028-02-28", 1), "2028-02-29");
  });
});

describe("journey input validation", () => {
  it("strictly validates calendar dates and months without normalizing invalid input", () => {
    for (const departureDate of [
      "",
      "2026-02-29",
      "2026-04-31",
      "2026-9-07",
      "2026-09-07T12:00:00Z",
    ]) {
      assert.equal(
        tripDatesSchema.safeParse({ departureDate, returnDate: "2026-09-08" }).success,
        false,
        departureDate,
      );
    }
    assert.equal(
      tripDatesSchema.safeParse({ departureDate: "2028-02-29", returnDate: "2028-02-29" }).success,
      true,
    );
    for (const month of ["", "2026-00", "2026-13", "2026-9", "2026-09-01"]) {
      assert.equal(monthSchema.safeParse(month).success, false, month);
    }
    assert.equal(monthSchema.safeParse("2026-09").success, true);
  });

  it("rejects invalid and reversed dates and requires a saved path ID", () => {
    assert.equal(
      tripDatesSchema.safeParse({ departureDate: "2026-02-30", returnDate: "2026-03-01" }).success,
      false,
    );
    assert.equal(
      createKmsTripSchema.safeParse({
        pathId: crypto.randomUUID(),
        departureDate: "2026-09-08",
        returnDate: "2026-09-07",
      }).success,
      false,
    );
    assert.equal(
      createKmsTripSchema.safeParse({
        pathId: "",
        departureDate: "2026-09-07",
        returnDate: "2026-09-07",
      }).success,
      false,
    );
  });

  it("accepts only path ID and travel dates, ignoring client ownership and route overrides", () => {
    const data = {
      pathId: crypto.randomUUID(),
      departureDate: "2026-09-07",
      returnDate: "2026-09-07",
    };
    assert.deepEqual(
      createKmsTripSchema.parse({ ...data, userId: "bob", origin: "Fake origin", distance: 999 }),
      data,
    );
  });

  it("creates date-free paths and rejects fractional or invalid distances", () => {
    const input = { ...path, origin: " Sede ", distance: "100" };
    const parsed = createKmsPathSchema.parse(input);
    assert.equal(parsed.origin, "Sede");
    assert.equal("date" in parsed, false);
    for (const distance of ["", "0", "-1", "12.5", "Infinity", "abc", "2147483648"]) {
      assert.equal(createKmsPathSchema.safeParse({ ...input, distance }).success, false, distance);
    }
    assert.equal(createKmsPathSchema.safeParse({ ...input, reason: "  " }).success, false);
  });
});
