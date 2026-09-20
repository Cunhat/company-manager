import z from "zod";

const cents = z.number().int().min(0).max(100_000_000);
const rate = z.number().int().min(0).max(10_000);
export const payrollMonthSchema = z
  .string()
  .regex(/^(19|20|21)\d{2}-(0[1-9]|1[0-2])$/, "Choose a valid month");
export const payrollKindSchema = z.enum(["monthly", "holiday", "christmas"]);
export const paymentKindSchema = z.enum(["salary", "ss", "irs"]);
export const salaryValuesSchema = z
  .object({
    grossCents: cents.min(1, "Enter a gross salary greater than zero"),
    mealCents: cents,
    ssRate: rate,
    tsuRate: rate,
    irsRate: rate,
    irsOverrideCents: cents.nullable().default(null),
  })
  .refine((v) => v.ssRate + v.irsRate <= 10_000, "SS and IRS rates cannot exceed 100% together")
  .refine(
    (v) =>
      Math.round((v.grossCents * v.ssRate) / 10_000) +
        (v.irsOverrideCents ?? Math.round((v.grossCents * v.irsRate) / 10_000)) <=
      v.grossCents,
    "SS and IRS deductions cannot exceed gross salary",
  );
export const saveSettingsSchema = z.object({
  values: salaryValuesSchema,
  accountId: z.uuid("Choose your usual account"),
});
export const generatePayrollSchema = z.object({
  month: payrollMonthSchema,
  kind: payrollKindSchema,
  values: salaryValuesSchema,
  expected: z.object({ perDiemCents: cents, mileageCents: cents }),
});
export const applyPayrollSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
  values: salaryValuesSchema,
});
export const payPayrollSchema = z.object({
  id: z.uuid(),
  revision: z.number().int().positive(),
  kind: paymentKindSchema,
  date: z.iso.date(),
  accountId: z.uuid("Choose a payment account"),
});
export const unpayPayrollSchema = payPayrollSchema.pick({ id: true, kind: true });
export const deletePayrollSchema = applyPayrollSchema.pick({ id: true, revision: true });
export type SalaryValues = z.infer<typeof salaryValuesSchema>;
export type PayrollKind = z.infer<typeof payrollKindSchema>;
export type PaymentKind = z.infer<typeof paymentKindSchema>;
