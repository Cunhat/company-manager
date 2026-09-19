import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { and, eq } from "@company-manager/db/operators";
import { transaction } from "@company-manager/db/schema/transactions";
import { createServerFn } from "@tanstack/react-start";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { requireOwnedAccount } from "@/features/accounts/server/queries";
import {
  createTransactionSchema,
  transactionIdSchema,
  updateTransactionSchema,
} from "../schemas/validators";

export const getTransactions = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view transactions");
    return createDb().query.transaction.findMany({
      where: (table, { eq }) => eq(table.userId, userId),
      orderBy: (table, { desc }) => [desc(table.createdAt), desc(table.id)],
    });
  });
export const getTransactionsQuery = queryOptions({
  queryKey: ["transactions"],
  queryFn: getTransactions,
});

export const createTransaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId)
      throw new Error("You must be signed in to create a transaction");
    const db = createDb();
    await requireOwnedAccount(db, userId, data.accountId);
    const { date, ...values } = data;
    const [created] = await db
      .insert(transaction)
      .values({
        ...values,
        userId,
        createdAt: new Date(`${date}T00:00:00.000Z`),
      })
      .returning();
    return created;
  });

export const updateTransaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateTransactionSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to edit a transaction");
    const db = createDb();
    await requireOwnedAccount(db, userId, data.accountId);
    const { id, date, ...values } = data;
    const [updated] = await db
      .update(transaction)
      .set({
        ...values,
        createdAt: new Date(`${date}T00:00:00.000Z`),
        updatedAt: new Date(),
      })
      .where(and(eq(transaction.id, id), eq(transaction.userId, userId)))
      .returning();
    if (!updated)
      throw new Error("Transaction not found or no longer available");
    return updated;
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(transactionIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId)
      throw new Error("You must be signed in to delete a transaction");
    const [deleted] = await createDb()
      .delete(transaction)
      .where(and(eq(transaction.id, data.id), eq(transaction.userId, userId)))
      .returning({ id: transaction.id });
    if (!deleted)
      throw new Error("Transaction not found or no longer available");
    return deleted;
  });

export const createTransactionMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof createTransactionSchema>) =>
    createTransaction({ data }),
});
export const updateTransactionMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof updateTransactionSchema>) =>
    updateTransaction({ data }),
});
export const deleteTransactionMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof transactionIdSchema>) =>
    deleteTransaction({ data }),
});
