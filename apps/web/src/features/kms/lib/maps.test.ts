import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  emptyLocalKms,
  entriesForMonth,
  generateMonthlyMap,
  kmsStorageKey,
  nightsBetween,
  readLocalKms,
  replaceTrips,
  returnAfterNights,
  writeLocalKms,
} from "./maps";
import { createKmsPathSchema, tripDatesSchema } from "../schemas/validators";
import type { KmsTrip } from "../schemas/types";

const trip: KmsTrip = {
  id: "00000000-0000-4000-8000-000000000001",
  pathId: "00000000-0000-4000-8000-000000000002",
  origin: "Sede",
  destination: "Porto",
  reason: "Client meeting",
  distance: 137,
  departureDate: "2026-09-07",
  returnDate: "2026-09-07",
};

describe("mileage maps", () => {
  it("creates both directions and calculates money in cents at the fixed rate", () => {
    const result = generateMonthlyMap([trip], "2026-09");
    assert.equal(result.entries.length, 2);
    assert.deepEqual(
      result.entries.map(({ origin, destination }) => [origin, destination]),
      [
        ["Sede", "Porto"],
        ["Porto", "Sede"],
      ],
    );
    assert.equal(result.totalKilometres, 274);
    assert.equal(result.totalAmountCents, 10960);
    assert.equal(result.ratePerKm, 0.4);
  });

  it("preserves repeated paths as independent trips and sorts actual travel dates", () => {
    const repeat = {
      ...trip,
      id: "00000000-0000-4000-8000-000000000003",
      departureDate: "2026-09-05",
      returnDate: "2026-09-06",
    };
    const result = generateMonthlyMap([trip, repeat], "2026-09");
    assert.equal(result.entries.length, 4);
    assert.equal(new Set(result.entries.map((entry) => entry.id)).size, 4);
    assert.deepEqual(
      result.entries.map((entry) => entry.date),
      ["2026-09-05", "2026-09-06", "2026-09-07", "2026-09-07"],
    );
    assert.equal(result.totalKilometres, 548);
    assert.equal(result.totalAmountCents, 21920);
  });

  it("splits months and years by journey date without billing days spent away", () => {
    const crossMonth = { ...trip, departureDate: "2026-09-30", returnDate: "2026-10-02" };
    assert.equal(generateMonthlyMap([crossMonth], "2026-09").totalAmountCents, 5480);
    const october = entriesForMonth([crossMonth], "2026-10");
    assert.equal(october.length, 1);
    assert.equal(october[0].direction, "return");
    const crossYear = { ...trip, departureDate: "2026-12-31", returnDate: "2027-01-02" };
    assert.equal(entriesForMonth([crossYear], "2026-12").length, 1);
    assert.equal(entriesForMonth([crossYear], "2027-01").length, 1);
    assert.equal(entriesForMonth([crossYear], "2027-02").length, 0);
  });

  it("keeps the distance unchanged for longer stays and handles calendar nights", () => {
    const longStay = { ...trip, returnDate: "2026-09-15" };
    assert.equal(generateMonthlyMap([longStay], "2026-09").totalKilometres, 274);
    assert.equal(nightsBetween("2026-03-28", "2026-03-30"), 2);
    assert.equal(returnAfterNights("2026-03-28", 2), "2026-03-30");
    assert.equal(returnAfterNights("2028-02-28", 1), "2028-02-29");
  });

  it("invalidates both affected generated maps when a trip is removed", () => {
    const crossMonth = { ...trip, departureDate: "2026-09-30", returnDate: "2026-10-02" };
    const unrelated = generateMonthlyMap([], "2026-08");
    const state = {
      ...emptyLocalKms(),
      trips: [crossMonth],
      maps: {
        "2026-08": unrelated,
        "2026-09": generateMonthlyMap([crossMonth], "2026-09"),
        "2026-10": generateMonthlyMap([crossMonth], "2026-10"),
      },
    };
    const next = replaceTrips(state, [], crossMonth);
    assert.deepEqual(next.trips, []);
    assert.deepEqual(next.maps, { "2026-08": unrelated });
    assert.equal(Object.keys(state.maps).length, 3);
  });
});

describe("validation and storage", () => {
  it("rejects invalid dates, reversed dates and fractional or invalid path distances", () => {
    assert.equal(
      tripDatesSchema.safeParse({ departureDate: "2026-02-30", returnDate: "2026-03-01" }).success,
      false,
    );
    assert.equal(
      tripDatesSchema.safeParse({ departureDate: "2026-09-08", returnDate: "2026-09-07" }).success,
      false,
    );
    const path = {
      origin: " Sede ",
      destination: " Porto ",
      reason: " Meeting ",
      description: "",
      distance: "100",
    };
    assert.equal(createKmsPathSchema.parse(path).origin, "Sede");
    for (const distance of ["", "0", "-1", "12.5", "Infinity", "abc", "2147483648"]) {
      assert.equal(createKmsPathSchema.safeParse({ ...path, distance }).success, false, distance);
    }
    assert.equal(createKmsPathSchema.safeParse({ ...path, reason: "  " }).success, false);
  });

  it("round-trips drafts and generated results while isolating accounts", () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
    };
    const state = {
      ...emptyLocalKms(),
      trips: [trip],
      maps: { "2026-09": generateMonthlyMap([trip], "2026-09") },
    };
    writeLocalKms(storage, "alice", state);
    assert.deepEqual(readLocalKms(storage, "alice"), state);
    assert.deepEqual(readLocalKms(storage, "bob"), emptyLocalKms());
    assert.ok(values.has(kmsStorageKey("alice")));
  });

  it("reports corrupt or unavailable storage instead of silently replacing it", () => {
    assert.throws(() => readLocalKms({ getItem: () => "bad json" }, "alice"));
    assert.throws(() => readLocalKms({ getItem: () => '{"version":2}' }, "alice"));
    assert.throws(() =>
      readLocalKms(
        {
          getItem: () => {
            throw new Error("Access denied");
          },
        },
        "alice",
      ),
    );
    assert.throws(() =>
      writeLocalKms(
        {
          setItem: () => {
            throw new Error("Quota exceeded");
          },
        },
        "alice",
        emptyLocalKms(),
      ),
    );
  });
});
