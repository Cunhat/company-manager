import { CreateExpenseDialog } from "@/features/expenses/components/create-expense-dialog";
import ListExpenses from "../sections/list-expenses";

export default function ExpensesView() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Expenses</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your expenses, all in one place.</p>
        </div>
        <CreateExpenseDialog />
      </div>
      <ListExpenses />
    </div>
  );
}
