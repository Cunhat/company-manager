import { Button } from "@/components/ui/button";
import { IVA_RATE } from "@/lib/consts";
import { IconArrowDown, IconReceiptEuro } from "@tabler/icons-react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getExpensesQuery } from "../server/functions";
import type { Expense } from "../schemas/types";
import { useRef, useState } from "react";
import { EditExpenseSheet } from "../components/edit-expense-sheet";

const amountFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
});

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default function ListExpenses() {
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const { data: expenses, isError, isFetching, refetch } = useSuspenseQuery(getExpensesQuery);

  return (
    <section
      aria-labelledby="expense-list-heading"
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 id="expense-list-heading" tabIndex={-1} className="text-sm font-semibold">
            All expenses
          </h2>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums dark:text-teal-300">
            {expenses.length}
          </span>
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconArrowDown className="size-3.5" aria-hidden="true" />
          Newest first
        </span>
      </div>

      <ExpensesTable
        expenses={expenses}
        isError={isError}
        isFetching={isFetching}
        refetch={refetch}
        onSelect={(expense, trigger) => {
          returnFocus.current = trigger;
          setSelectedExpense(expense);
        }}
      />
      {selectedExpense ? (
        <EditExpenseSheet
          key={selectedExpense.id}
          expense={selectedExpense}
          returnFocus={returnFocus.current}
          onClose={() => setSelectedExpense(null)}
        />
      ) : null}
    </section>
  );
}

function ExpensesTable({
  expenses,
  isError,
  isFetching,
  refetch,
  onSelect,
}: {
  expenses: Expense[];
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  onSelect: (expense: Expense, trigger: HTMLElement | null) => void;
}) {
  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 border-b bg-destructive/5 px-5 py-4"
      >
        <p className="text-sm">Could not refresh expenses. Please try again.</p>
        <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Retrying..." : "Try again"}
        </Button>
      </div>
    );
  }

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-teal-300">
          <IconReceiptEuro className="size-6" aria-hidden="true" />
        </div>
        <h3 className="font-semibold">No expenses yet</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Create your first expense to see its details here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Expense list" tabIndex={0}>
      <table className="w-full min-w-[680px] text-left text-sm">
        <caption className="sr-only">All expenses, ordered by date, newest first</caption>
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">
              Title
            </th>
            <th
              scope="col"
              aria-sort="descending"
              className="whitespace-nowrap px-5 py-3 font-medium"
            >
              Date
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              Amount
            </th>
            <th scope="col" className="px-5 py-3 text-right font-medium">
              IVA
            </th>
            <th scope="col" className="px-5 py-3 font-medium">
              IVA status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {expenses.map((expense) => {
            const iva = expense.iva;
            const date = new Date(expense.createdAt);

            return (
              <tr
                key={expense.id}
                className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:bg-muted/50"
                onClick={(event) => onSelect(expense, event.currentTarget.querySelector("button"))}
              >
                <th scope="row" className="min-w-48 px-5 py-5 font-medium">
                  <button
                    type="button"
                    aria-label={`Edit expense ${expense.title}`}
                    aria-haspopup="dialog"
                    className="block max-w-lg cursor-pointer rounded-sm text-left break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [overflow-wrap:anywhere]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(expense, event.currentTarget);
                    }}
                  >
                    {expense.title}
                  </button>
                </th>
                <td className="whitespace-nowrap px-5 py-5 text-muted-foreground tabular-nums">
                  <time dateTime={date.toISOString()}>{dateFormatter.format(date)}</time>
                </td>
                <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums">
                  {amountFormatter.format(Number(expense.value))}
                </td>
                <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums">
                  {amountFormatter.format(Number(expense.value) * IVA_RATE)}
                </td>
                <td className="px-5 py-5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${iva ? "bg-primary/10 text-primary dark:text-teal-300" : "bg-muted text-muted-foreground"}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {iva ? "With IVA" : "Without IVA"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
