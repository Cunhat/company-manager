import z from "zod";

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Enter a title"),
  value: z
    .string()
    .regex(/^\d+(?:\.\d{1,2})?$/, "Enter an amount with up to two decimal places")
    .refine((value) => {
      const amount = Number(value);
      return Number.isFinite(amount) && amount > 0;
    }, "Enter an amount greater than 0"),
  date: z.iso.date("Pick a valid date"),
  iva: z.boolean(),
});

export const expenseIdSchema = z.object({ id: z.uuid() });
export const updateExpenseSchema = createExpenseSchema.extend(expenseIdSchema.shape);
