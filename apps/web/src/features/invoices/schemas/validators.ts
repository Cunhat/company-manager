import { positiveMoneySchema, requiredAccountSchema } from "@/features/accounts/schemas/validators";
import z from "zod";

export const invoiceStatuses = ["pending", "paid", "cancelled"] as const;
export const ivaStatuses = ["pending", "paid"] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];
export type IvaStatus = (typeof ivaStatuses)[number];

export const createInvoiceSchema = z.object({
  name: z.string().min(1, "Enter a name"),
  description: z.string(),
  value: positiveMoneySchema,
  accountId: requiredAccountSchema,
  date: z.iso.date("Pick a valid date"),
  status: z.enum(invoiceStatuses),
  ivaStatus: z.enum(ivaStatuses),
});

export const invoiceIdSchema = z.object({ id: z.uuid() });
export const editInvoiceFormSchema = createInvoiceSchema.extend({
  accountId: z.union([requiredAccountSchema, z.literal("")]),
});
export const updateInvoiceSchema = editInvoiceFormSchema.extend(invoiceIdSchema.shape);
