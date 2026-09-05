import {
  IconCirclePercentageFilled,
  IconCoinEuroFilled,
  IconFileInvoiceFilled,
  IconReceiptEuroFilled,
} from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import StatCard from "../components/stat-card";
import { getWidgetsQuery } from "../server/widgets";
import { IVA_RATE } from "@/lib/consts";

const amountFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

export default function YearToDateSection() {
  const { data: widgets } = useSuspenseQuery(getWidgetsQuery());

  const invoices = widgets.invoices.reduce(
    (sum, invoice) => sum + invoice.value,
    0,
  );
  const expenses = widgets.expenses.reduce(
    (sum, expense) => sum + Number(expense.value),
    0,
  );
  const profit = invoices - expenses;

  const expensesIva = widgets.expenses
    .filter((expense) => expense.iva)
    .reduce((sum, expense) => sum + Number(expense.value) * IVA_RATE, 0);

  const collectedIva = invoices * IVA_RATE - expensesIva;

  return (
    <section
      aria-label="Year to date totals"
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
    >
      {[
        {
          label: "Sales invoices",
          value: amountFormatter.format(invoices),
          note: `${widgets.invoices.length} paid invoices`,
          icon: IconFileInvoiceFilled,
        },
        {
          label: "Expenses",
          value: amountFormatter.format(expenses),
          note: `${widgets.expenses.length} expense documents`,
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
          note: "Paid invoices minus recorded expenses",
          icon: IconCoinEuroFilled,
        },
      ].map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </section>
  );
}
