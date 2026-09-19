import TransactionsView from "@/features/transactions/views/transactions-view";
import { getTransactionsQuery } from "@/features/transactions/server/functions";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/transactions")({
  component: TransactionsView,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(getTransactionsQuery),
      context.queryClient.ensureQueryData(getAccountsQuery),
    ]);
  },
});
