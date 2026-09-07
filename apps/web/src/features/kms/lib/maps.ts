import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import type { KmsEntry, KmsTrip, LocalKms, MonthlyKmsMap } from "../schemas/types";
import { localKmsSchema, monthSchema } from "../schemas/validators";

export const RATE_CENTS_PER_KM = 40;
export const amountFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
export const formatAmount = (cents: number) => amountFormatter.format(cents / 100);
export const formatTravelDate = (date: string) => format(parseISO(date), "dd MMM yyyy");
export const nightsBetween = (departure: string, returned: string) =>
  differenceInCalendarDays(parseISO(returned), parseISO(departure));
export const returnAfterNights = (departure: string, nights: number) =>
  format(addDays(parseISO(departure), nights), "yyyy-MM-dd");

export function entriesForMonth(trips: KmsTrip[], month: string): KmsEntry[] {
  monthSchema.parse(month);
  return trips
    .flatMap((trip): KmsEntry[] => {
      const common = {
        tripId: trip.id,
        pathId: trip.pathId,
        reason: trip.reason,
        distance: trip.distance,
        amountCents: trip.distance * RATE_CENTS_PER_KM,
      };
      return [
        {
          ...common,
          id: `${trip.id}:outward`,
          direction: "outward",
          date: trip.departureDate,
          origin: trip.origin,
          destination: trip.destination,
        },
        {
          ...common,
          id: `${trip.id}:return`,
          direction: "return",
          date: trip.returnDate,
          origin: trip.destination,
          destination: trip.origin,
        },
      ];
    })
    .filter((entry) => entry.date.slice(0, 7) === month)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function generateMonthlyMap(trips: KmsTrip[], month: string): MonthlyKmsMap {
  const entries = entriesForMonth(trips, month);
  return {
    month,
    ratePerKm: (RATE_CENTS_PER_KM / 100) as 0.4,
    entries,
    totalKilometres: entries.reduce((sum, entry) => sum + entry.distance, 0),
    totalAmountCents: entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    generatedAt: new Date().toISOString(),
  };
}

export function replaceTrips(state: LocalKms, trips: KmsTrip[], changedTrip: KmsTrip): LocalKms {
  const maps = { ...state.maps };
  delete maps[changedTrip.departureDate.slice(0, 7)];
  delete maps[changedTrip.returnDate.slice(0, 7)];
  return { ...state, trips, maps };
}

export const kmsStorageKey = (userId: string) => `company-manager:kms:v1:${userId}`;
export const emptyLocalKms = (): LocalKms => ({ version: 1, trips: [], maps: {} });

export function readLocalKms(storage: Pick<Storage, "getItem">, userId: string): LocalKms {
  const raw = storage.getItem(kmsStorageKey(userId));
  return raw === null ? emptyLocalKms() : localKmsSchema.parse(JSON.parse(raw));
}

export function writeLocalKms(storage: Pick<Storage, "setItem">, userId: string, state: LocalKms) {
  storage.setItem(kmsStorageKey(userId), JSON.stringify(localKmsSchema.parse(state)));
}
