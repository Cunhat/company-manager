import { getWidgetsQuery } from "@/features/dashboard/server/widgets";
import DashboardView from "@/features/dashboard/views/dashboard-view";
import { getExpensesQuery } from "@/features/expenses/server/functions";
import { getInvoicesQuery } from "@/features/invoices/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/")({
  component: DashboardView,
  loader: async ({ context }) => {
    await context.queryClient.query({
      ...getWidgetsQuery(),
      staleTime: "static",
    });
    await context.queryClient.query({
      ...getInvoicesQuery,
      staleTime: "static",
    });
    await context.queryClient.query({
      ...getExpensesQuery,
      staleTime: "static",
    });
  },
});
