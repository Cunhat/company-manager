import { authMiddleware } from "@/middleware/auth";
import { createDb } from "@company-manager/db";
import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getYearlyInvoicesAndExpenses = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();

    const year = dayjs().tz("Europe/Lisbon").year();
    const startOfYear = dayjs.utc(`${year}-01-01`).toDate();
    const startOfNextYear = dayjs.utc(`${year + 1}-01-01`).toDate();

    const invoicesQuery = db.query.invoice.findMany({
      where: (invoice, { eq, ne, and, gte, lt }) =>
        and(
          eq(invoice.userId, userId),
          ne(invoice.status, "cancelled"),
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

    const [invoices, expenses] = await Promise.all([invoicesQuery, expensesQuery]);

    return {
      invoices,
      expenses,
    };
  });

export const getYearlyInvoicesAndExpensesQuery = () =>
  queryOptions({
    queryKey: ["yearly-invoices-and-expenses", dayjs().tz("Europe/Lisbon").year()],
    queryFn: getYearlyInvoicesAndExpenses,
  });
