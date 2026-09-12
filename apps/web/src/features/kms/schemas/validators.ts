import z from "zod";
import dayjs, { isTravelDate, isTravelMonth } from "../lib/dates";

export const distanceSchema = z.number().int().positive().max(2_147_483_647);

export const exportMonthlyPdfSchema = z.object({
  company: z.string().trim().min(1, "Enter a company name").max(250),
  car: z.string().trim().min(1, "Enter a car").max(100),
  licensePlate: z.string().trim().min(1, "Enter a license plate").max(20),
  employee: z.string().trim().min(1, "Enter an employee name").max(100),
});

export const createKmsPathSchema = z.object({
  origin: z.string().trim().min(1, "Enter an origin").max(250),
  destination: z.string().trim().min(1, "Enter a destination").max(250),
  reason: z.string().trim().min(1, "Enter a business purpose").max(500),
  distance: z
    .string()
    .trim()
    .min(1, "Enter a distance")
    .refine(
      (value) => distanceSchema.safeParse(Number(value)).success,
      "Enter a positive whole number of kilometres",
    ),
  description: z.string().trim().max(2000),
});

export const tripDatesSchema = z
  .object({
    departureDate: z.string().refine(isTravelDate, "Choose a valid departure date"),
    returnDate: z.string().refine(isTravelDate, "Choose a valid return date"),
  })
  .refine((trip) => !dayjs(trip.returnDate).isBefore(dayjs(trip.departureDate), "day"), {
    message: "Return date must be on or after departure",
    path: ["returnDate"],
  });

export const createKmsTripSchema = tripDatesSchema.safeExtend({
  pathId: z.uuid("Choose a saved path"),
});

export const journeyIdSchema = z.object({ id: z.uuid() });

export const monthSchema = z.string().refine(isTravelMonth, "Choose a valid travel month");

const entrySchema = z.object({
  id: z.string(),
  date: z.string().refine(isTravelDate, "Choose a valid travel date"),
  origin: z.string(),
  destination: z.string(),
  reason: z.string(),
  description: z.string().nullable(),
  distance: distanceSchema,
  amountCents: z.number().int().nonnegative(),
});

export const monthlyMapSchema = z.object({
  month: monthSchema,
  ratePerKm: z.literal(0.4),
  entries: z.array(entrySchema),
  totalKilometres: z.number().int().nonnegative(),
  totalAmountCents: z.number().int().nonnegative(),
  generatedAt: z.iso.datetime(),
});
