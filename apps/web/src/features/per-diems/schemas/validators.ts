import z from "zod";
import dayjs, { isTravelDate } from "@/features/kms/lib/dates";
import { exportMonthlyPdfSchema, monthSchema } from "@/features/kms/schemas/validators";

export const exportPerDiemPdfSchema = exportMonthlyPdfSchema.pick({
  company: true,
  employee: true,
});

export const territorySchema = z.enum(["portugal", "abroad"]);
export const perDiemTypeSchema = z.enum(["daily", "departure", "intermediate", "return"]);
export const percentageSchema = z
  .string()
  .regex(/^(100|[1-9]?\d)$/, "Enter a whole percentage from 0 to 100");
export const dailyRateSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a daily rate with up to two decimal places")
  .refine(
    (value) => Number(value) > 0 && Number(value) <= 10000,
    "Enter a rate between €0.01 and €10,000",
  );

const allowanceFields = {
  origin: z.string().trim().min(1, "Enter an origin").max(250),
  description: z.string().trim().max(500),
  destination: z.string().trim().min(1, "Enter a destination").max(250),
  reason: z.string().trim().min(1, "Enter a business purpose").max(500),
  territory: territorySchema,
  dailyRate: dailyRateSchema,
};

export const createPerDiemSchema = z
  .object({
    ...allowanceFields,
    month: monthSchema,
    sourceJourneyId: z.uuid("Choose a mileage journey"),
    returnJourneyId: z.uuid().optional(),
    departureDate: z.string().refine(isTravelDate, "Choose a valid departure date"),
    returnDate: z.string().refine(isTravelDate, "Choose a valid return date"),
    dailyPercentage: percentageSchema,
    departurePercentage: percentageSchema,
    intermediatePercentage: percentageSchema,
    returnPercentage: percentageSchema,
  })
  .superRefine((value, ctx) => {
    if (!isTravelDate(value.departureDate) || !isTravelDate(value.returnDate)) return;
    const days = dayjs.utc(value.returnDate).diff(dayjs.utc(value.departureDate), "day");
    if (days < 0 || days >= 90) {
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Choose a return date within 90 days, on or after departure",
      });
    }
    if (!value.departureDate.startsWith(`${value.month}-`)) {
      ctx.addIssue({
        code: "custom",
        path: ["departureDate"],
        message: "Choose a journey in the selected month",
      });
    }
  });

export const editPerDiemSchema = z.object({
  ...allowanceFields,
  date: z.string().refine(isTravelDate, "Choose a valid date"),
  type: perDiemTypeSchema,
  percentage: percentageSchema,
});
export const updatePerDiemSchema = editPerDiemSchema.extend({ id: z.uuid() });
export const perDiemIdSchema = z.object({ id: z.uuid() });
