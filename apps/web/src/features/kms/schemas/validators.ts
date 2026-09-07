import z from "zod";

export const distanceSchema = z.number().int().positive().max(2_147_483_647);

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
    departureDate: z.iso.date("Choose a valid departure date"),
    returnDate: z.iso.date("Choose a valid return date"),
  })
  .refine((trip) => trip.returnDate >= trip.departureDate, {
    message: "Return date must be on or after departure",
    path: ["returnDate"],
  });

export const tripSchema = z
  .object({
    id: z.uuid(),
    pathId: z.uuid(),
    origin: z.string().min(1),
    destination: z.string().min(1),
    reason: z.string().min(1),
    distance: distanceSchema,
    departureDate: z.iso.date(),
    returnDate: z.iso.date(),
  })
  .refine((trip) => trip.returnDate >= trip.departureDate);

export const monthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

const entrySchema = z.object({
  id: z.string(),
  tripId: z.uuid(),
  pathId: z.uuid(),
  direction: z.enum(["outward", "return"]),
  date: z.iso.date(),
  origin: z.string(),
  destination: z.string(),
  reason: z.string(),
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

export const localKmsSchema = z.object({
  version: z.literal(1),
  trips: z.array(tripSchema),
  maps: z.record(monthSchema, monthlyMapSchema),
});
