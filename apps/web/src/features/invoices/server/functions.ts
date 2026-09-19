import { requireOpenQuarter } from "@/features/iva/server/guard";
import { requireOwnedAccount, validateRecordAccount } from "@/features/accounts/server/queries";
import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createInvoiceSchema, invoiceIdSchema, updateInvoiceSchema } from "../schemas/validators";
import { and, eq } from "@company-manager/db/operators";
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
    await requireOpenQuarter(db, userId, data.date);
    await requireOwnedAccount(db, userId, data.accountId);
    await db.insert(invoice).values({
      accountId: data.accountId,
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

export const updateInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateInvoiceSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to edit an invoice");

    const db = createDb();
    const existing = await db.query.invoice.findFirst({
      where: and(eq(invoice.id, data.id), eq(invoice.userId, userId)),
    });
    if (!existing) throw new Error("Invoice not found or no longer available");
    await Promise.all([
      requireOpenQuarter(db, userId, existing.createdAt),
      requireOpenQuarter(db, userId, data.date),
    ]);
    await validateRecordAccount(db, userId, data.accountId || null, existing.accountId);
    const [updated] = await db
      .update(invoice)
      .set({
        accountId: data.accountId || null,
        name: data.name,
        description: data.description,
        value: Number(data.value),
        createdAt: new Date(`${data.date}T00:00:00.000Z`),
        status: data.status,
        updatedAt: new Date(),
      })
      .where(and(eq(invoice.id, data.id), eq(invoice.userId, userId)))
      .returning();

    if (!updated) throw new Error("Invoice not found or no longer available");
    return updated;
  });

export const deleteInvoice = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(invoiceIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to delete an invoice");

    const db = createDb();
    const existing = await db.query.invoice.findFirst({
      where: and(eq(invoice.id, data.id), eq(invoice.userId, userId)),
    });
    if (!existing) throw new Error("Record not found or no longer available");
    await requireOpenQuarter(db, userId, existing.createdAt);
    const [deleted] = await db
      .delete(invoice)
      .where(and(eq(invoice.id, data.id), eq(invoice.userId, userId)))
      .returning({ id: invoice.id });

    if (!deleted) throw new Error("Invoice not found or no longer available");
    return deleted;
  });

export const updateInvoiceMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof updateInvoiceSchema>) => updateInvoice({ data }),
});

export const deleteInvoiceMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof invoiceIdSchema>) => deleteInvoice({ data }),
});
