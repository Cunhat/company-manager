import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconArrowDown, IconFileInvoice } from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import type { InvoiceStatus } from "../schemas/validators";
import { getInvoicesQuery } from "../server/functions";
import type { Invoice } from "../schemas/types";
import { useRef, useState } from "react";
import { EditInvoiceSheet } from "../components/edit-invoice-sheet";

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

const statuses: Record<InvoiceStatus, { label: string; className: string }> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-800 dark:text-amber-300",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-destructive/10 text-destructive",
  },
};

export default function ListInvoices() {
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const { data: invoices, isPending, isError, isFetching, refetch } = useQuery(getInvoicesQuery);

  return (
    <section
      aria-labelledby="invoice-list-heading"
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div className="flex items-center gap-2.5">
          <h2 id="invoice-list-heading" tabIndex={-1} className="text-sm font-semibold">
            All invoices
          </h2>
          {invoices ? (
            <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary tabular-nums dark:text-teal-300">
              {invoices.length}
            </span>
          ) : null}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <IconArrowDown className="size-3.5" aria-hidden="true" />
          Newest first
        </span>
      </div>

      <InvoicesTable
        invoices={invoices}
        isError={isError}
        isFetching={isFetching}
        refetch={refetch}
        isPending={isPending}
        onSelect={(invoice, trigger) => {
          returnFocus.current = trigger;
          setSelectedInvoice(invoice);
        }}
      />
      {selectedInvoice ? (
        <EditInvoiceSheet
          key={selectedInvoice.id}
          invoice={selectedInvoice}
          returnFocus={returnFocus.current}
          onClose={() => setSelectedInvoice(null)}
        />
      ) : null}
    </section>
  );
}

function InvoicesTable({
  invoices,
  isError,
  isFetching,
  refetch,
  isPending,
  onSelect,
}: {
  invoices: Invoice[] | undefined;
  isError: boolean;
  isFetching: boolean;
  refetch: () => void;
  isPending: boolean;
  onSelect: (invoice: Invoice, trigger: HTMLElement | null) => void;
}) {
  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 border-b bg-destructive/5 px-5 py-4"
      >
        <p className="text-sm">
          {invoices
            ? "Could not refresh invoices. Showing the last loaded list."
            : "Could not load your invoices. Please try again."}
        </p>
        <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
          {isFetching ? "Retrying..." : "Try again"}
        </Button>
      </div>
    );
  }

  if (isPending) {
    return (
      <div role="status" className="divide-y px-5">
        <span className="sr-only">Loading invoices</span>
        {Array.from({ length: 5 }, (_, index) => (
          <div key={index} className="flex items-center gap-6 py-5" aria-hidden="true">
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="ml-auto h-5 w-20" />
            <Skeleton className="h-5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="flex flex-col items-center px-6 py-16 text-center">
        <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-teal-300">
          <IconFileInvoice className="size-6" aria-hidden="true" />
        </div>
        <h3 className="font-semibold">No invoices yet</h3>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">
          Create your first invoice to see its details and status here.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" role="region" aria-label="Invoice list" tabIndex={0}>
      <table className="w-full min-w-[560px] text-left text-sm">
        <caption className="sr-only">All invoices, ordered by date, newest first</caption>
        <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-5 py-3 font-medium">
              Name
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
            <th scope="col" className="px-5 py-3 font-medium">
              Status
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {invoices?.map((invoice) => {
            const status = statuses[invoice.status];
            const date = new Date(invoice.createdAt);

            return (
              <tr
                key={invoice.id}
                className="cursor-pointer transition-colors hover:bg-muted/50 focus-within:bg-muted/50"
                onClick={(event) => onSelect(invoice, event.currentTarget.querySelector("button"))}
              >
                <th scope="row" className="min-w-48 px-5 py-5 font-medium">
                  <button
                    type="button"
                    aria-label={`Edit invoice ${invoice.name}`}
                    aria-haspopup="dialog"
                    className="block max-w-lg cursor-pointer rounded-sm text-left break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring [overflow-wrap:anywhere]"
                    onClick={(event) => {
                      event.stopPropagation();
                      onSelect(invoice, event.currentTarget);
                    }}
                  >
                    {invoice.name}
                  </button>
                </th>
                <td className="whitespace-nowrap px-5 py-5 text-muted-foreground tabular-nums">
                  <time dateTime={date.toISOString()}>{dateFormatter.format(date)}</time>
                </td>
                <td className="whitespace-nowrap px-5 py-5 text-right font-medium tabular-nums">
                  {amountFormatter.format(invoice.value)}
                </td>
                <td className="px-5 py-5">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
                  >
                    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                    {status.label}
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
