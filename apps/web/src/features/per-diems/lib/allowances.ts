import dayjs from "@/features/kms/lib/dates";
import { monthSchema } from "@/features/kms/schemas/validators";
import type { KmsJourney } from "@/features/kms/schemas/types";
import type { AllowanceDay, CreatePerDiem, PerDiem } from "../schemas/types";
import { createPerDiemSchema } from "../schemas/validators";

// Manager reference rates checked September 2026. Each saved day retains its own rate.
export const MANAGER_RATES = { portugal: "72.65", abroad: "167.07" } as const;
export const PER_DIEM_DISTANCE_MESSAGE =
  "Per diems require more than 20 km for each mileage journey, including the return journey.";

export function tripMeetsPerDiemDistance(trip: PerDiemJourney) {
  return trip.distance > 20 && (!trip.returnJourney || trip.returnJourney.distance > 20);
}

export const TYPE_LABELS = {
  daily: "Daily",
  departure: "Multi-day · departure",
  intermediate: "Multi-day · intermediate day",
  return: "Multi-day · return",
} as const;
export const PDF_TYPE_LABELS = {
  daily: "Diária",
  departure: "Dias sucessivos - ida",
  intermediate: "Dias sucessivos - dia intermédio",
  return: "Dias sucessivos - regresso",
} as const;

export function allowanceCents(day: Pick<AllowanceDay, "dailyRateCents" | "percentage">) {
  return Math.round((day.dailyRateCents * day.percentage) / 100);
}

export function allowanceDays(input: CreatePerDiem): AllowanceDay[] {
  const values = createPerDiemSchema.parse(input);
  const count = dayjs.utc(values.returnDate).diff(dayjs.utc(values.departureDate), "day") + 1;
  return Array.from({ length: count }, (_, index) => {
    const type =
      count === 1
        ? "daily"
        : index === 0
          ? "departure"
          : index === count - 1
            ? "return"
            : "intermediate";
    return {
      date: dayjs.utc(values.departureDate).add(index, "day").format("YYYY-MM-DD"),
      type,
      sourceOrigin: type === "return" ? values.destination : values.origin,
      destination: type === "return" ? values.origin : values.destination,
      reason: type === "return" ? "Regresso" : values.reason,
      description: type === "departure" || type === "intermediate" ? values.description : "",
      territory: values.territory,
      dailyRateCents: Math.round(Number(values.dailyRate) * 100),
      percentage: Number(values[`${type}Percentage`]),
    };
  });
}

export function perDiemsForMonth<T extends AllowanceDay>(entries: T[], month: string) {
  monthSchema.parse(month);
  return entries
    .filter((entry) => entry.date.startsWith(`${month}-`))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function valuesFromJourney(journey: PerDiemJourney, month: string): CreatePerDiem {
  const date = dayjs.utc(journey.date).format("YYYY-MM-DD");
  return {
    month,
    sourceJourneyId: journey.id,
    departureDate: date,
    returnDate: journey.returnJourney ? travelDate(journey.returnJourney) : date,
    returnJourneyId: journey.returnJourney?.id,
    origin: journey.origin,
    description: "Com prenoita",
    destination: journey.destination,
    reason: journey.reason,
    territory: "portugal",
    dailyRate: MANAGER_RATES.portugal,
    dailyPercentage: "25",
    departurePercentage: "100",
    intermediatePercentage: "100",
    returnPercentage: "25",
  };
}

export function perDiemsFromJourney(
  input: CreatePerDiem,
  source: KmsJourney,
  userId: string,
  returning?: KmsJourney,
) {
  if (
    input.returnJourneyId &&
    (!returning ||
      returning.id !== input.returnJourneyId ||
      returning.userId !== userId ||
      !reverseRoute(source, returning) ||
      travelDate(returning) !== input.returnDate)
  ) {
    throw new Error("The return journey must match the route and return date");
  }
  if (source.userId !== userId || source.id !== input.sourceJourneyId) {
    throw new Error("Mileage journey not found or no longer available");
  }
  if (dayjs.utc(source.date).format("YYYY-MM-DD") !== input.departureDate) {
    throw new Error("The departure date must match the selected mileage journey");
  }
  if (!tripMeetsPerDiemDistance({ ...source, returnJourney: returning })) {
    throw new Error(PER_DIEM_DISTANCE_MESSAGE);
  }
  return allowanceDays({ ...input, origin: source.origin }).map((day) => ({
    ...day,
    userId,
    sourceJourneyId: day.type === "return" && returning ? returning.id : source.id,
    sourceDistance: day.type === "return" && returning ? returning.distance : source.distance,
  }));
}

export function editValues(entry: PerDiem) {
  return {
    date: entry.date,
    origin: entry.sourceOrigin,
    description: entry.description,
    destination: entry.destination,
    reason: entry.reason,
    type: entry.type,
    territory: entry.territory,
    dailyRate: (entry.dailyRateCents / 100).toFixed(2),
    percentage: String(entry.percentage),
  };
}

export type PerDiemJourney = KmsJourney & { returnJourney?: KmsJourney };
const travelDate = (journey: KmsJourney) => dayjs.utc(journey.date).format("YYYY-MM-DD");
const place = (value: string) => value.trim().toLocaleLowerCase("pt-PT");
function reverseRoute(outward: KmsJourney, returning: KmsJourney) {
  return (
    outward.id !== returning.id &&
    outward.userId === returning.userId &&
    place(outward.origin) === place(returning.destination) &&
    place(outward.destination) === place(returning.origin)
  );
}

// Match each reverse leg once, before the next departure on the same route.
// Legacy journeys have no direction metadata, so infer their direction from the route
// and chronology. Purpose text never determines direction.
export function pairMileageJourneys(journeys: KmsJourney[]): PerDiemJourney[] {
  const sorted = [...journeys].sort(
    (a, b) =>
      travelDate(a).localeCompare(travelDate(b)) ||
      Number(a.isReturn === true) - Number(b.isReturn === true) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
      a.id.localeCompare(b.id),
  );
  const used = new Set<string>();
  const trips: PerDiemJourney[] = [];
  for (let index = 0; index < sorted.length; index++) {
    const outward = sorted[index];
    if (used.has(outward.id) || outward.isReturn === true) continue;
    let returning: KmsJourney | undefined;
    for (let next = index + 1; next < sorted.length; next++) {
      const candidate = sorted[next];
      if (used.has(candidate.id) || candidate.userId !== outward.userId) continue;
      if (dayjs.utc(candidate.date).diff(dayjs.utc(outward.date), "day") >= 90) break;
      if (
        place(candidate.origin) === place(outward.origin) &&
        place(candidate.destination) === place(outward.destination) &&
        travelDate(candidate) !== travelDate(outward)
      )
        break;
      if (candidate.isReturn !== false && reverseRoute(outward, candidate)) {
        returning = candidate;
        used.add(candidate.id);
        break;
      }
    }
    used.add(outward.id);
    trips.push({ ...outward, returnJourney: returning });
  }
  return trips;
}

export function tripHasClaimedDays(trip: PerDiemJourney, claimedDates: Set<string>) {
  const start = travelDate(trip);
  const end = trip.returnJourney ? travelDate(trip.returnJourney) : start;
  return [...claimedDates].some((date) => date >= start && date <= end);
}
