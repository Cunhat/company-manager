import {
  IconCirclePercentageFilled,
  IconCoinEuroFilled,
  IconFileInvoiceFilled,
  IconReceiptEuroFilled,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import StatCard from "../components/stat-card";
import CurrentBalanceCard from "../components/current-balance-card";
import { getYearlyInvoicesAndExpensesQuery } from "../server/yearly-invoices-and-expenses";
import { IVA_RATE } from "@/lib/consts";
import { getExpenseNetValue } from "@/lib/expense";

const amountFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export default function YearToDateSection() {
  const { data } = useSuspenseQuery(getYearlyInvoicesAndExpensesQuery());

  const invoices = data.invoices.reduce((sum, invoice) => sum + invoice.value, 0);
  const expenses = data.expenses.reduce((sum, expense) => sum + getExpenseNetValue(expense), 0);
  const profit = invoices - expenses;

  const expensesIva = data.expenses
    .filter((expense) => expense.iva)
    .reduce((sum, expense) => sum + Number(expense.value) - getExpenseNetValue(expense), 0);

  const collectedIva = invoices * IVA_RATE - expensesIva;

  return (
    <section
      aria-label="Current balance and year to date totals"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
    >
      <CurrentBalanceCard />
      {[
        {
          label: "Sales invoices",
          value: amountFormatter.format(invoices),
          note: `${data.invoices.length} pending and paid invoices`,
          icon: IconFileInvoiceFilled,
        },
        {
          label: "Expenses",
          value: amountFormatter.format(expenses),
          note: `${data.expenses.length} expense documents, excluding deductible IVA`,
          icon: IconReceiptEuroFilled,
        },
        {
          label: "Net IVA generated",
          value: amountFormatter.format(collectedIva),
          note: "IVA amounts are not recorded",
          icon: IconCirclePercentageFilled,
        },
        {
          label: "Profit before tax",
          value: amountFormatter.format(profit),
          note: "Invoices minus expenses, excluding deductible IVA",
          icon: IconCoinEuroFilled,
        },
      ].map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
