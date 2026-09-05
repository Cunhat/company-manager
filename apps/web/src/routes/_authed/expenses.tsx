import ExpensesView from "@/features/expenses/views/expenses-view";
import { getExpensesQuery } from "@/features/expenses/server/functions";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/expenses")({
  component: ExpensesView,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...getExpensesQuery, staleTime: "static" });
  },
});
