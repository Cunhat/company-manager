import dayjs from "./dates";
import type { KmsEntry, KmsJourney, MonthlyKmsMap } from "../schemas/types";
import { monthSchema } from "../schemas/validators";

export const RATE_CENTS_PER_KM = 40;
export const amountFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});
export const formatAmount = (cents: number) => amountFormatter.format(cents / 100);
export const formatTravelDate = (date: string) => dayjs(date).format("DD MMM YYYY");
export const nightsBetween = (departure: string, returned: string) =>
  dayjs(returned).diff(dayjs(departure), "day");
export const returnAfterNights = (departure: string, nights: number) =>
  dayjs(departure).add(nights, "day").format("YYYY-MM-DD");

export function entriesForMonth(journeys: KmsJourney[], month: string): KmsEntry[] {
  monthSchema.parse(month);
  return journeys
    .map((journey) => ({
      id: journey.id,
      date: dayjs.utc(journey.date).format("YYYY-MM-DD"),
      origin: journey.origin,
      destination: journey.destination,
      reason: journey.reason,
      distance: journey.distance,
      amountCents: journey.distance * RATE_CENTS_PER_KM,
    }))
    .filter((entry) => dayjs(entry.date).isSame(dayjs(month), "month"))
    .sort((a, b) => dayjs(a.date).diff(dayjs(b.date)));
}

export function generateMonthlyMap(journeys: KmsJourney[], month: string): MonthlyKmsMap {
  const entries = entriesForMonth(journeys, month);
  return {
    month,
    ratePerKm: (RATE_CENTS_PER_KM / 100) as 0.4,
    entries,
    totalKilometres: entries.reduce((sum, entry) => sum + entry.distance, 0),
    totalAmountCents: entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    generatedAt: dayjs().toISOString(),
  };
}
