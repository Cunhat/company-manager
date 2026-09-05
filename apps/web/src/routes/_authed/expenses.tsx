import ExpensesView from "@/features/expenses/views/expenses-view";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/expenses")({
  component: ExpensesView,
});
