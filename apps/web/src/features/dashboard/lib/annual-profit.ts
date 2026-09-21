import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import { getExpenseNetValue } from "../../../lib/expense";

dayjs.extend(utc);
dayjs.extend(timezone);

type Invoice = { value: number; status: string; createdAt: Date | string };
type Expense = { id: string; value: string; iva: boolean; createdAt: Date | string };
type PayrollRecord = { id: string; month: string; netCents: number; companyCents: number };
type PayrollPayment = {
  recordId: string;
  kind: string;
  expenseId: string | null;
  paidAt: Date | string | null;
};

export type AnnualProfitInput = {
  invoices: Invoice[];
  expenses: Expense[];
  records: PayrollRecord[];
  payments: PayrollPayment[];
};

// Mainland SME estimate. CIRC art. 87 and Law 64/2025's transitional rates.
// https://info.portaldasfinancas.gov.pt/pt/informacao_fiscal/codigos_tributarios/CIRC_2R/Pages/irc87.aspx
export function ircRates(year: number) {
  return {
    reduced: year <= 2025 ? 16 : 15,
    standard: year <= 2025 ? 20 : year === 2026 ? 19 : year === 2027 ? 18 : 17,
  };
}

export function estimateIrc(profitCents: number, year: number) {
  const taxable = Math.max(0, profitCents);
  const rates = ircRates(year);
  return Math.round(
    (Math.min(taxable, 5_000_000) * rates.reduced +
      Math.max(0, taxable - 5_000_000) * rates.standard) /
      100,
  );
}

type ProfitAmounts = {
  revenueCents: number;
  expensesCents: number;
  payrollCents: number;
  salaryReceivedCents: number;
};

function profitTotals(amounts: ProfitAmounts, year: number) {
  const profitCents = amounts.revenueCents - amounts.expensesCents - amounts.payrollCents;
  const ircCents = estimateIrc(profitCents, year);
  const afterIrcCents = profitCents - ircCents;
  const distributableCents = Math.max(0, afterIrcCents);
  const dividendIrsCents = Math.round(distributableCents * 0.28);
  const netDividendCents = distributableCents - dividendIrsCents;
  return {
    ...amounts,
    profitCents,
    ircCents,
    afterIrcCents,
    dividendIrsCents,
    netDividendCents,
    personalTotalCents: amounts.salaryReceivedCents + netDividendCents,
  };
}

export function calculateAnnualProfit(input: AnnualProfitInput, now = new Date()) {
  const today = dayjs.utc(dayjs(now).tz("Europe/Lisbon").format("YYYY-MM-DD"));
  const year = today.year();
  const currentMonth = today.format("YYYY-MM");
  const throughToday = (date: Date | string | null) => {
    if (!date) return false;
    const value = dayjs.utc(date);
    return value.year() === year && !value.isAfter(today, "day");
  };
  const salaryExpenseIds = new Set(
    input.payments
      .filter((payment) => payment.kind === "salary")
      .map((payment) => payment.expenseId),
  );
  const paidInvoices = input.invoices.filter(
    (invoice) => invoice.status === "paid" && throughToday(invoice.createdAt),
  );
  const expenses = input.expenses.filter(
    (expense) => throughToday(expense.createdAt) && !salaryExpenseIds.has(expense.id),
  );
  const payroll = input.records.filter(
    (record) => record.month.startsWith(`${year}-`) && record.month <= currentMonth,
  );
  const paidRecordIds = new Set(
    input.payments
      .filter((payment) => payment.kind === "salary" && throughToday(payment.paidAt))
      .map((payment) => payment.recordId),
  );
  const salaryReceivedCents = input.records.reduce(
    (sum, record) => sum + (paidRecordIds.has(record.id) ? record.netCents : 0),
    0,
  );
  const actual = profitTotals(
    {
      revenueCents: paidInvoices.reduce((sum, invoice) => sum + Math.round(invoice.value * 100), 0),
      expensesCents: expenses.reduce(
        (sum, expense) => sum + Math.round(getExpenseNetValue(expense) * 100),
        0,
      ),
      payrollCents: payroll.reduce((sum, record) => sum + record.companyCents, 0),
      salaryReceivedCents,
    },
    year,
  );

  return {
    year,
    asOf: today.format("D MMM YYYY"),
    rates: ircRates(year),
    actual,
    hasActivity:
      paidInvoices.length > 0 ||
      expenses.length > 0 ||
      payroll.length > 0 ||
      salaryReceivedCents > 0,
  };
}

export type AnnualProfit = ReturnType<typeof calculateAnnualProfit>;
