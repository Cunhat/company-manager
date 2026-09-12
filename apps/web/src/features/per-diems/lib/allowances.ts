import dayjs from "@/features/kms/lib/dates";
import { monthSchema } from "@/features/kms/schemas/validators";
import type { KmsJourney } from "@/features/kms/schemas/types";
import type { AllowanceDay, CreatePerDiem, PerDiem } from "../schemas/types";
import { createPerDiemSchema } from "../schemas/validators";

// Manager reference rates checked September 2026. Each saved day retains its own rate.
export const MANAGER_RATES = { portugal: "72.65", abroad: "167.07" } as const;
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
      destination: values.destination,
      reason: values.reason,
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

export function valuesFromJourney(journey: KmsJourney, month: string): CreatePerDiem {
  const date = dayjs.utc(journey.date).format("YYYY-MM-DD");
  return {
    month,
    sourceJourneyId: journey.id,
    departureDate: date,
    returnDate: date,
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

export function perDiemsFromJourney(input: CreatePerDiem, source: KmsJourney, userId: string) {
  if (source.userId !== userId || source.id !== input.sourceJourneyId) {
    throw new Error("Mileage journey not found or no longer available");
  }
  if (dayjs.utc(source.date).format("YYYY-MM-DD") !== input.departureDate) {
    throw new Error("The departure date must match the selected mileage journey");
  }
  return allowanceDays(input).map((day) => ({
    ...day,
    userId,
    sourceJourneyId: source.id,
    sourceOrigin: source.origin,
    sourceDistance: source.distance,
  }));
}

export function editValues(entry: PerDiem) {
  return {
    date: entry.date,
    destination: entry.destination,
    reason: entry.reason,
    type: entry.type,
    territory: entry.territory,
    dailyRate: (entry.dailyRateCents / 100).toFixed(2),
    percentage: String(entry.percentage),
  };
}
