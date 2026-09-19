import { getYearlyInvoicesAndExpensesQuery } from "@/features/dashboard/server/yearly-invoices-and-expenses";
import { getQuarterlyMetricsQuery } from "@/features/dashboard/server/quarterly-metrics";
import DashboardView from "@/features/dashboard/views/dashboard-view";
import { getExpensesQuery } from "@/features/expenses/server/functions";
import { getInvoicesQuery } from "@/features/invoices/server/functions";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: DashboardView,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.query(getAccountsQuery),
      context.queryClient.query(getQuarterlyMetricsQuery()),
      context.queryClient.query({
        ...getYearlyInvoicesAndExpensesQuery(),
        staleTime: "static",
      }),
      context.queryClient.query({
        ...getInvoicesQuery,
        staleTime: "static",
      }),
      context.queryClient.query({
        ...getExpensesQuery,
        staleTime: "static",
      }),
    ]);
  },
});
