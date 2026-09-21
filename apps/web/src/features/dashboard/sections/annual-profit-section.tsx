import { useQueries } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getSalaryQuery } from "@/features/salary/server/functions";
import AnnualProfitSummary from "../components/annual-profit-summary";
import { calculateAnnualProfit } from "../lib/annual-profit";
import { getYearlyInvoicesAndExpensesQuery } from "../server/yearly-invoices-and-expenses";

const authedRoute = getRouteApi("/_authed");

export default function AnnualProfitSection() {
  const { session } = authedRoute.useRouteContext();
  const [documents, salary] = useQueries({
    queries: [getYearlyInvoicesAndExpensesQuery(), getSalaryQuery(session.user.id)],
  });

  if (documents.isError || salary.isError) {
    return (
      <section role="alert" className="rounded-xl border bg-card p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Your profit</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Could not load the records needed to calculate profit.
        </p>
        <Button
          variant="outline"
          className="mt-4 h-11 transition-[scale,background-color,color] duration-150 active:scale-[0.96] active:translate-y-0 motion-reduce:transform-none motion-reduce:transition-none"
          disabled={documents.isFetching || salary.isFetching}
          onClick={() => void Promise.all([documents.refetch(), salary.refetch()])}
        >
          Try again
        </Button>
      </section>
    );
  }

  if (!documents.data || !salary.data) {
    return (
      <section
        role="status"
        className="rounded-xl border bg-card p-5 text-sm text-muted-foreground sm:p-6"
      >
        Loading your profit and salary records…
      </section>
    );
  }

  const data = calculateAnnualProfit({
    ...documents.data,
    records: salary.data.records,
    payments: salary.data.payments,
  });
  return <AnnualProfitSummary data={data} />;
}
