import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { and, asc, eq, getTableColumns, sql } from "@company-manager/db/operators";
import { financialAccount } from "@company-manager/db/schema/account";
import { createServerFn } from "@tanstack/react-start";
import { mutationOptions, queryOptions } from "@tanstack/react-query";
import type { z } from "zod";
import { accountIdSchema, createAccountSchema, updateAccountSchema } from "../schemas/validators";
import { invoice } from "@company-manager/db/schema/invoice";
import { expense } from "@company-manager/db/schema/expense";
import { transaction } from "@company-manager/db/schema/transactions";
import { IVA_RATE } from "@/lib/consts";

export const getAccounts = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to view accounts");
    const db = createDb();
    // Aggregate each source separately so multiple invoices/expenses cannot multiply amounts.
    // PostgreSQL numeric arithmetic rounds IVA per invoice before adding the totals.
    const invoiceIncome = sql`coalesce((select sum(round(${invoice.value} * (1 + ${String(IVA_RATE)}::numeric), 2))
        from ${invoice} where ${invoice.accountId} = ${financialAccount.id}
        and ${invoice.userId} = ${userId} and ${invoice.status} = 'paid'), 0)`;
    const expenseTotal = sql`coalesce((select sum(${expense.value}) from ${expense}
        where ${expense.accountId} = ${financialAccount.id} and ${expense.userId} = ${userId}), 0)`;
    const manualIncome = sql`coalesce((select sum(${transaction.value}) from ${transaction}
        where ${transaction.accountId} = ${financialAccount.id} and ${transaction.userId} = ${userId}
        and ${transaction.type} = 'income'), 0)`;
    const manualExpenses = sql`coalesce((select sum(${transaction.value}) from ${transaction}
        where ${transaction.accountId} = ${financialAccount.id} and ${transaction.userId} = ${userId}
        and ${transaction.type} = 'expense'), 0)`;

    return db
      .select({
        ...getTableColumns(financialAccount),
        invoiceIncome: sql<string>`${invoiceIncome}::text`,
        expenseTotal: sql<string>`${expenseTotal}::text`,
        manualIncome: sql<string>`${manualIncome}::text`,
        manualExpenses: sql<string>`${manualExpenses}::text`,
        balance: sql<string>`round(${financialAccount.openingBalance} + ${invoiceIncome} - ${expenseTotal}
          + ${manualIncome} - ${manualExpenses}, 2)::text`,
      })
      .from(financialAccount)
      .where(eq(financialAccount.userId, userId))
      .orderBy(asc(financialAccount.name));
  });

export const getAccountsQuery = queryOptions({
  queryKey: ["accounts"],
  queryFn: getAccounts,
});

export const createAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(createAccountSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;

    if (!userId) throw new Error("You must be signed in to create an account");

    const [created] = await createDb()
      .insert(financialAccount)
      .values({ ...data, userId })
      .returning();
    return created;
  });

export const updateAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(updateAccountSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to edit an account");
    const { id, ...values } = data;
    const [updated] = await createDb()
      .update(financialAccount)
      .set({ ...values, updatedAt: new Date() })
      .where(and(eq(financialAccount.id, id), eq(financialAccount.userId, userId)))
      .returning();
    if (!updated) throw new Error("Account not found or no longer available");
    return updated;
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(accountIdSchema)
  .handler(async ({ context, data }) => {
    const userId = context.session?.user.id;
    if (!userId) throw new Error("You must be signed in to delete an account");
    // The database cascades manual transactions and unassigns invoices and expenses atomically.
    const [deleted] = await createDb()
      .delete(financialAccount)
      .where(and(eq(financialAccount.id, data.id), eq(financialAccount.userId, userId)))
      .returning({ id: financialAccount.id });
    if (!deleted) throw new Error("Account not found or no longer available");
    return deleted;
  });

export const createAccountMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof createAccountSchema>) => createAccount({ data }),
});
export const updateAccountMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof updateAccountSchema>) => updateAccount({ data }),
});
export const deleteAccountMutation = mutationOptions({
  mutationFn: (data: z.infer<typeof accountIdSchema>) => deleteAccount({ data }),
});
