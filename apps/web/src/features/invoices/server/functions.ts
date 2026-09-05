import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createInvoiceSchema } from "../schemas/validators";
import { invoice } from "@company-manager/db/schema/invoice";
import type { z } from "zod";

export const getInvoices = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();
    return db.query.invoice.findMany({
      where: (invoice, { eq }) => eq(invoice.userId, userId),
      orderBy: (invoice, { desc }) => desc(invoice.createdAt),
    });
  });

export const getInvoicesQuery = queryOptions({
  queryKey: ["invoices"],
  queryFn: getInvoices,
});

export const createInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createInvoiceSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();
    await db.insert(invoice).values({
      userId,
      name: data.name,
      description: data.description,
      value: Number(data.value),
      createdAt: new Date(`${data.date}T00:00:00.000Z`),
      status: data.status,
    });
  });

export const createInvoiceMutation = mutationOptions({
  mutationKey: ["createInvoice"],
  mutationFn: (data: z.infer<typeof createInvoiceSchema>) => createInvoice({ data }),
});
