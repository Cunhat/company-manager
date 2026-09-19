import AccountsView from "@/features/accounts/views/accounts-view";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/accounts")({
  component: AccountsView,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(getAccountsQuery);
  },
});
