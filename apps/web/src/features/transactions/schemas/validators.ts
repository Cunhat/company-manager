import z from "zod";
import { positiveMoneySchema, requiredAccountSchema } from "@/features/accounts/schemas/validators";

export const createTransactionSchema = z.object({
  accountId: requiredAccountSchema,
  value: positiveMoneySchema,
  type: z.enum(["income", "expense"]),
  description: z.string().trim().max(1000),
  date: z.iso.date("Pick a valid date"),
});
export const transactionIdSchema = z.object({ id: z.uuid() });
export const updateTransactionSchema = createTransactionSchema.extend(transactionIdSchema.shape);
