import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";

export const getWidgets = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();

    const today = dayjs();
    const startOfYear = today.startOf("year").toDate();
    const startOfNextYear = today.add(1, "year").startOf("year").toDate();

    const invoicesQuery = db.query.invoice.findMany({
      where: (invoice, { eq, and, gte, lt }) =>
        and(
          eq(invoice.userId, userId),
          eq(invoice.status, "paid"),
          gte(invoice.createdAt, startOfYear),
          lt(invoice.createdAt, startOfNextYear),
        ),
    });

    const expensesQuery = db.query.expense.findMany({
      where: (expense, { eq, and, gte, lt }) =>
        and(
          eq(expense.userId, userId),
          gte(expense.createdAt, startOfYear),
          lt(expense.createdAt, startOfNextYear),
        ),
    });

    const [invoices, expenses] = await Promise.all([
      invoicesQuery,
      expensesQuery,
    ]);

    return {
      invoices,
      expenses,
    };
  });

export const getWidgetsQuery = () =>
  queryOptions({
    queryKey: ["widgets"],
    queryFn: getWidgets,
  });
