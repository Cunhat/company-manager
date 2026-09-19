import { useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { IconArrowsExchange } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import {
  AccountFilter,
  matchesAccount,
} from "@/features/accounts/components/account-filter";
import { dateFormatter, moneyFormatter } from "@/features/accounts/lib/format";
import { getTransactionsQuery } from "../server/functions";
import { EditTransactionSheet } from "../components/edit-transaction-sheet";
import type { Transaction } from "../schemas/types";

export default function ListTransactions() {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<Transaction | null>(null);

  const returnFocus = useRef<HTMLElement | null>(null);

  const {
    data: transactions,
    isError,
    refetch,
  } = useSuspenseQuery(getTransactionsQuery);
  const { data: accounts } = useSuspenseQuery(getAccountsQuery);

  const visible = transactions.filter((item) => matchesAccount(item, filter));
  const accountNames = new Map(
    accounts.map((account) => [account.id, account.name]),
  );

  return (
    <section
      aria-labelledby="transaction-list-heading"
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-end gap-3 border-b px-5 py-4">
        <AccountFilter value={filter} onChange={setFilter} />
      </div>
      {isError ? (
        <div role="alert" className="p-6">
          Could not refresh transactions.{" "}
          <Button onClick={() => void refetch()} variant="outline">
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <IconArrowsExchange
            className="mb-4 size-8 text-primary"
            aria-hidden="true"
          />
          <h3 className="font-semibold">
            No transactions {filter === "all" ? "yet" : "for this account"}
          </h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Record other money movements here. Invoices and expenses already
            contribute to your balances separately.
          </p>
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Transaction list"
          tabIndex={0}
        >
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {["Description", "Account", "Date", "Type", "Amount"].map(
                  (label) => (
                    <th
                      key={label}
                      scope="col"
                      className={`px-5 py-3 font-medium ${label === "Amount" ? "text-right" : ""}`}
                    >
                      {label}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-muted/50">
                  <th scope="row" className="px-5 py-5 font-medium">
                    <button
                      type="button"
                      className="max-w-md cursor-pointer rounded-sm text-left break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                      aria-label={`Edit transaction ${item.description || item.type}`}
                      aria-haspopup="dialog"
                      onClick={(event) => {
                        returnFocus.current = event.currentTarget;
                        setSelected(item);
                      }}
                    >
                      {item.description ||
                        (item.type === "income" ? "Income" : "Expense")}
                    </button>
                  </th>
                  <td className="px-5 py-5">
                    {accountNames.get(item.accountId) ?? "Account unavailable"}
                  </td>
                  <td className="whitespace-nowrap px-5 py-5 text-muted-foreground">
                    <time dateTime={new Date(item.createdAt).toISOString()}>
                      {dateFormatter.format(new Date(item.createdAt))}
                    </time>
                  </td>
                  <td className="px-5 py-5 capitalize">{item.type}</td>
                  <td
                    className={`whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums ${item.type === "income" ? "text-emerald-700 dark:text-emerald-300" : ""}`}
                  >
                    {item.type === "income" ? "+" : "−"}
                    {moneyFormatter.format(Number(item.value))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected ? (
        <EditTransactionSheet
          key={selected.id}
          transaction={selected}
          returnFocus={returnFocus.current}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
