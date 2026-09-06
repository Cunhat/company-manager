import { createServerFn } from "@tanstack/react-start";
import { createDb } from "@company-manager/db";
import { authMiddleware } from "@/middleware/auth";
import { queryOptions } from "@tanstack/react-query";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { calculateQuarterlyMetrics } from "../lib/quarterly-metrics";

dayjs.extend(utc);
dayjs.extend(timezone);

export const getQuarterlyMetrics = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const userId = context.session?.user.id;

    if (!userId) {
      throw new Error("User ID not found in session");
    }

    const db = createDb();
    const now = dayjs().tz("Europe/Lisbon").toDate();
    const year = dayjs(now).tz("Europe/Lisbon").year();
    const startOfYear = dayjs.utc(`${year}-01-01`).toDate();
    const startOfNextYear = dayjs.utc(`${year + 1}-01-01`).toDate();

    const [invoices, expenses] = await Promise.all([
      db.query.invoice.findMany({
        columns: { value: true, createdAt: true, status: true },
        where: (invoice, { and, eq, ne, gte, lt, lte }) =>
          and(
            eq(invoice.userId, userId),
            ne(invoice.status, "cancelled"),
            gte(invoice.createdAt, startOfYear),
            lt(invoice.createdAt, startOfNextYear),
            lte(invoice.createdAt, now),
          ),
      }),
      db.query.expense.findMany({
        columns: { value: true, createdAt: true, iva: true },
        where: (expense, { and, eq, gte, lt, lte }) =>
          and(
            eq(expense.userId, userId),
            gte(expense.createdAt, startOfYear),
            lt(expense.createdAt, startOfNextYear),
            lte(expense.createdAt, now),
          ),
      }),
    ]);

    return calculateQuarterlyMetrics(invoices, expenses, now);
  });

export const getQuarterlyMetricsQuery = () =>
  queryOptions({
    queryKey: ["quarterly-metrics"],
    queryFn: getQuarterlyMetrics,
  });
