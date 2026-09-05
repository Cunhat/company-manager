// Fixed snapshot for the UI prototype. These are not the company's records.
export const demoQuarters = [
  {
    id: "Q1",
    period: "Jan – Mar",
    sales: 24000,
    expenses: 7200,
    invoices: 18,
    bills: 26,
    collected: 5520,
    deductible: 1380,
    filing: "20 May 2026",
    payment: "25 May 2026",
    status: "Paid",
    complete: true,
  },
  {
    id: "Q2",
    period: "Apr – Jun",
    sales: 32000,
    expenses: 9600,
    invoices: 24,
    bills: 31,
    collected: 7360,
    deductible: 1840,
    filing: "21 Sep 2026",
    payment: "25 Sep 2026",
    status: "Payment pending",
    complete: true,
  },
  {
    id: "Q3",
    period: "Jul – 5 Sep",
    sales: 18000,
    expenses: 5400,
    invoices: 14,
    bills: 19,
    collected: 4140,
    deductible: 1035,
    filing: "20 Nov 2026",
    payment: "25 Nov 2026",
    status: "In progress",
    complete: false,
  },
  {
    id: "Q4",
    period: "Oct – Dec",
    sales: 0,
    expenses: 0,
    invoices: 0,
    bills: 0,
    collected: 0,
    deductible: 0,
    filing: "22 Feb 2027*",
    payment: "25 Feb 2027*",
    status: "Not started",
    complete: false,
  },
] as const;

export const euro = (value: number) =>
  new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);

export type DashboardQuarter = (typeof demoQuarters)[number];

export const totals = demoQuarters.reduce(
  (sum, q) => ({
    sales: sum.sales + q.sales,
    expenses: sum.expenses + q.expenses,
    invoices: sum.invoices + q.invoices,
    bills: sum.bills + q.bills,
    collected: sum.collected + q.collected,
    deductible: sum.deductible + q.deductible,
  }),
  { sales: 0, expenses: 0, invoices: 0, bills: 0, collected: 0, deductible: 0 },
);
export const paidIva = demoQuarters
  .filter((q) => q.status === "Paid")
  .reduce((sum, q) => sum + q.collected - q.deductible, 0);

export const profit = totals.sales - totals.expenses;
