import { positiveMoneySchema, requiredAccountSchema } from "@/features/accounts/schemas/validators";
import z from "zod";

export const createExpenseSchema = z.object({
  title: z.string().trim().min(1, "Enter a title"),
  value: positiveMoneySchema,
  accountId: requiredAccountSchema,
  date: z.iso.date("Pick a valid date"),
  iva: z.boolean(),
});

export const expenseIdSchema = z.object({ id: z.uuid() });
export const editExpenseFormSchema = createExpenseSchema.extend({
  accountId: z.union([requiredAccountSchema, z.literal("")]),
});
export const updateExpenseSchema = editExpenseFormSchema.extend(expenseIdSchema.shape);
