import { createFileRoute } from "@tanstack/react-router";
import IvaView from "@/features/iva/views/iva-view";
import { getIvaQuery } from "@/features/iva/server/functions";
import { getInvoicesQuery } from "@/features/invoices/server/functions";
import { getExpensesQuery } from "@/features/expenses/server/functions";
import { getAccountsQuery } from "@/features/accounts/server/functions";

export const Route = createFileRoute("/_authed/iva")({
  component: IvaView,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getIvaQuery),
      context.queryClient.ensureQueryData(getInvoicesQuery),
      context.queryClient.ensureQueryData(getExpensesQuery),
      context.queryClient.ensureQueryData(getAccountsQuery),
    ]);
  },
});
