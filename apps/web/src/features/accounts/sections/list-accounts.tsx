import { useRef, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { IconBuildingBank, IconPencil } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { getAccountsQuery } from "../server/functions";
import { EditAccountSheet } from "../components/edit-account-sheet";
import { moneyFormatter } from "../lib/format";
import type { Account } from "../schemas/types";

export default function ListAccounts() {
  const [selected, setSelected] = useState<Account | null>(null);

  const {
    data: accounts,
    isError,
    refetch,
  } = useSuspenseQuery(getAccountsQuery);

  const returnFocus = useRef<HTMLElement | null>(null);

  if (isError)
    return (
      <div role="alert" className="rounded-xl border p-6">
        Could not refresh accounts.{" "}
        <Button variant="outline" onClick={() => void refetch()}>
          Try again
        </Button>
      </div>
    );

  return (
    <section aria-labelledby="account-list-heading">
      <h2 id="account-list-heading" tabIndex={-1} className="sr-only">
        Your accounts
      </h2>
      {accounts.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border bg-card px-6 py-16 text-center">
          <IconBuildingBank
            className="mb-4 size-8 text-primary"
            aria-hidden="true"
          />
          <h3 className="font-semibold">No accounts yet</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Create your first account, then assign your existing invoices and
            expenses to include them in its balance.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {accounts.map((account) => (
            <article
              key={account.id}
              className="overflow-hidden rounded-xl border bg-card"
            >
              <div className="flex items-start justify-between gap-4 px-5 pt-5">
                <div className="min-w-0">
                  <h3 className="break-words font-semibold">{account.name}</h3>
                  {account.description ? (
                    <p className="mt-1 break-words text-sm text-muted-foreground">
                      {account.description}
                    </p>
                  ) : null}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Edit account ${account.name}`}
                  onClick={(event) => {
                    returnFocus.current = event.currentTarget;
                    setSelected(account);
                  }}
                >
                  <IconPencil aria-hidden="true" />
                </Button>
              </div>
              <div className="px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Current balance
                </p>
                <p
                  className={`mt-2 text-3xl font-semibold tracking-tight tabular-nums ${Number(account.balance) < 0 ? "text-destructive" : "text-foreground"}`}
                >
                  {moneyFormatter.format(Number(account.balance))}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected ? (
        <EditAccountSheet
          key={selected.id}
          account={selected}
          returnFocus={returnFocus.current}
          onClose={() => setSelected(null)}
        />
      ) : null}
    </section>
  );
}
