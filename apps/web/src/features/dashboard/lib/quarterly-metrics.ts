import dayjs from "dayjs";
import isBetween from "dayjs/plugin/isBetween";
import { IVA_RATE } from "../../../lib/consts";
import { getExpenseNetValue } from "../../../lib/expense";

dayjs.extend(isBetween);

type Invoice = { value: number; createdAt: Date; status: string };
type Expense = { value: string; createdAt: Date; iva: boolean };

const quarters = [
  {
    id: "Q1",
    period: {
      start: dayjs("2026-01-01").toDate(),
      end: dayjs("2026-03-31").toDate(),
      label: "Jan – Mar",
    },
    expenses: 0,
    invoices: 0,
    collected: 0,
    deductible: 0,
    filing: "20 May 2026",
    payment: "25 May 2026",
    status: "Complete",
  },
  {
    id: "Q2",
    period: {
      start: dayjs("2026-04-01").toDate(),
      end: dayjs("2026-06-30").toDate(),
      label: "Apr – Jun",
    },
    expenses: 0,
    invoices: 0,
    collected: 0,
    deductible: 0,
    filing: "21 Sep 2026",
    payment: "25 Sep 2026",
    status: "In progress",
  },
  {
    id: "Q3",
    period: {
      start: dayjs("2026-07-01").toDate(),
      end: dayjs("2026-09-05").toDate(),
      label: "Jul – 5 Sep",
    },
    expenses: 0,
    invoices: 0,
    collected: 0,
    deductible: 0,
    filing: "20 Nov 2026",
    payment: "25 Nov 2026",
    status: "In progress",
  },
  {
    id: "Q4",
    period: {
      start: dayjs("2026-10-01").toDate(),
      end: dayjs("2026-12-31").toDate(),
      label: "Oct – Dec",
    },
    expenses: 0,
    invoices: 0,
    collected: 0,
    deductible: 0,
    filing: "22 Feb 2027*",
    payment: "25 Feb 2027*",
    status: "Not started",
  },
] as const;

export function calculateQuarterlyMetrics(
  invoices: Invoice[],
  expenses: Expense[],
  now = new Date(),
) {
  const quartersData = quarters.map((quarter) => {
    const invoicesInPeriod = invoices.filter((invoice) =>
      dayjs(invoice.createdAt).isBetween(quarter.period.start, quarter.period.end, "day", "[]"),
    );
    const expensesInPeriod = expenses.filter((expense) =>
      dayjs(expense.createdAt).isBetween(quarter.period.start, quarter.period.end, "day", "[]"),
    );

    const totalInvoices = invoicesInPeriod.reduce((sum, invoice) => sum + invoice.value, 0);
    const totalExpenses = expensesInPeriod.reduce(
      (sum, expense) => sum + getExpenseNetValue(expense),
      0,
    );
    const deductibleIva = expensesInPeriod
      .filter((expense) => expense.iva)
      .reduce((sum, expense) => sum + Number(expense.value) - getExpenseNetValue(expense), 0);

    return {
      ...quarter,
      invoices: Number(totalInvoices.toFixed(2)),
      expenses: Number(totalExpenses.toFixed(2)),
      collected: Number((totalInvoices * IVA_RATE).toFixed(2)),
      deductible: Number(deductibleIva.toFixed(2)),
    };
  });

  return {
    year: dayjs(quarters[0].period.start).year(),
    selectedQuarter: Math.floor(dayjs(now).month() / 3),
    quarters: quartersData,
  };
}

export type DashboardQuarter = ReturnType<typeof calculateQuarterlyMetrics>["quarters"][number];
