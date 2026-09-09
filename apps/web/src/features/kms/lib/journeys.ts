import type { journey } from "@company-manager/db/schema/journeys";
import type { kmsPath } from "@company-manager/db/schema/kms_path";
import type { CreateKmsTrip } from "../schemas/types";
import { monthSchema } from "../schemas/validators";
import dayjs from "./dates";

export function journeyMonthRange(month: string) {
  monthSchema.parse(month);
  const start = dayjs.utc(month).startOf("month");
  return { start: start.toDate(), end: start.add(1, "month").toDate() };
}

export function journeysFromPath(
  path: Pick<
    typeof kmsPath.$inferSelect,
    "origin" | "destination" | "reason" | "distance" | "description"
  >,
  dates: Pick<CreateKmsTrip, "departureDate" | "returnDate">,
  userId: string,
): (typeof journey.$inferInsert)[] {
  const common = {
    userId,
    reason: path.reason,
    distance: path.distance,
    description: path.description,
  };
  return [
    {
      ...common,
      origin: path.origin,
      destination: path.destination,
      date: dayjs.utc(dates.departureDate).toDate(),
    },
    {
      ...common,
      origin: path.destination,
      destination: path.origin,
      date: dayjs.utc(dates.returnDate).toDate(),
    },
  ];
}
