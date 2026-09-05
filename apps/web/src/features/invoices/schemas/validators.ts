import z from "zod";

export const invoiceStatuses = ["pending", "paid", "cancelled"] as const;

export type InvoiceStatus = (typeof invoiceStatuses)[number];

export const createInvoiceSchema = z.object({
  name: z.string().min(1, "Enter a name"),
  description: z.string(),
  value: z
    .string()
    .min(1, "Enter an amount")
    .refine((raw) => {
      const amount = Number(raw);
      return Number.isFinite(amount) && amount > 0;
    }, "Enter an amount greater than 0"),
  date: z.iso.date("Pick a valid date"),
  status: z.enum(invoiceStatuses),
});

export const invoiceIdSchema = z.object({ id: z.uuid() });
export const updateInvoiceSchema = createInvoiceSchema.extend(invoiceIdSchema.shape);
