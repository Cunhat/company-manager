import { getExpenseNetValue } from "@/lib/expense";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getYearlyInvoicesAndExpensesQuery } from "../server/yearly-invoices-and-expenses";
import DistributionEstimateSection from "./distribution-estimate-section";
import IrcEstimateSection from "./irc-estimate-section";
import NextIvaPayment from "./next-iva-payment";
import QuarterlyOverviewSection from "./quarterly-overview-section";
import YearToDateSection from "./year-to-date-section";

export default function WidgetsSection() {
  const { data } = useSuspenseQuery(getYearlyInvoicesAndExpensesQuery());
  const invoices = data.invoices.reduce(
    (sum, invoice) => sum + invoice.value,
    0,
  );
  const expenses = data.expenses.reduce(
    (sum, expense) => sum + getExpenseNetValue(expense),
    0,
  );
  const profit = invoices - expenses;
  const taxableProfit = Math.max(0, profit);
  const irc =
    Math.min(taxableProfit, 50000) * 0.15 +
    Math.max(0, taxableProfit - 50000) * 0.19;

  return (
    <div className="space-y-6">
      <YearToDateSection />
      <NextIvaPayment />
      <QuarterlyOverviewSection />
      <IrcEstimateSection irc={irc} />
      <DistributionEstimateSection profit={profit} irc={irc} />
    </div>
  );
}
