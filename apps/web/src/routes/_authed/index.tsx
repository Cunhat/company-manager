import { getIvaQuery } from "@/features/iva/server/functions";
import { getYearlyInvoicesAndExpensesQuery } from "@/features/dashboard/server/yearly-invoices-and-expenses";
import DashboardView from "@/features/dashboard/views/dashboard-view";
import { getSalaryQuery } from "@/features/salary/server/functions";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: DashboardView,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getIvaQuery),
      context.queryClient.query(getAccountsQuery),
      context.queryClient.query(getYearlyInvoicesAndExpensesQuery()),
      context.queryClient.query(getSalaryQuery(context.session.user.id)),
    ]);
  },
});
