import { requireOpenQuarter } from "@/features/iva/server/guard";
import { requireOwnedAccount, validateRecordAccount } from "@/features/accounts/server/queries";
import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { createExpenseSchema, expenseIdSchema, updateExpenseSchema } from "../schemas/validators";
import { and, eq } from "@company-manager/db/operators";
import { expense } from "@company-manager/db/schema/expense";
import type { z } from "zod";

export const getExpenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();
    return db.query.expense.findMany({
      where: (expense, { eq }) => eq(expense.userId, userId),
      orderBy: (expense, { desc }) => desc(expense.createdAt),
    });
  });

export const getExpensesQuery = queryOptions({
  queryKey: ["expenses"],
  queryFn: getExpenses,
});

export const createExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createExpenseSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();
    await requireOpenQuarter(db, userId, data.date);
    await requireOwnedAccount(db, userId, data.accountId);
    await db.insert(expense).values({
      accountId: data.accountId,
      userId,
      title: data.title,
      value: data.value,
      createdAt: new Date(`${data.date}T00:00:00.000Z`),
      iva: data.iva,
    });
  });

export const createExpenseMutation = mutationOptions({
  mutationKey: ["createExpense"],
  mutationFn: (data: z.infer<typeof createExpenseSchema>) => createExpense({ data }),
});

export const updateExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateExpenseSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to edit an expense");

    const db = createDb();
    const existing = await db.query.expense.findFirst({
      where: and(eq(expense.id, data.id), eq(expense.userId, userId)),
    });
    if (!existing) throw new Error("Expense not found or no longer available");
    await Promise.all([
      requireOpenQuarter(db, userId, existing.createdAt),
      requireOpenQuarter(db, userId, data.date),
    ]);
    await validateRecordAccount(db, userId, data.accountId || null, existing.accountId);
    const [updated] = await db
      .update(expense)
      .set({
        accountId: data.accountId || null,
        title: data.title,
        value: data.value,
        createdAt: new Date(`${data.date}T00:00:00.000Z`),
        iva: data.iva,
        updatedAt: new Date(),
      })
      .where(and(eq(expense.id, data.id), eq(expense.userId, userId)))
      .returning();

    if (!updated) throw new Error("Expense not found or no longer available");
    return updated;
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(expenseIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to delete an expense");

    const db = createDb();
    const existing = await db.query.expense.findFirst({
      where: and(eq(expense.id, data.id), eq(expense.userId, userId)),
    });
    if (!existing) throw new Error("Record not found or no longer available");
    await requireOpenQuarter(db, userId, existing.createdAt);
    const [deleted] = await db
      .delete(expense)
      .where(and(eq(expense.id, data.id), eq(expense.userId, userId)))
      .returning({ id: expense.id });

    if (!deleted) throw new Error("Expense not found or no longer available");
    return deleted;
  });

export const updateExpenseMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof updateExpenseSchema>) => updateExpense({ data }),
});

export const deleteExpenseMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof expenseIdSchema>) => deleteExpense({ data }),
});
