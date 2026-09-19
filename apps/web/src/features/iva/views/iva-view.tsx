import { useState } from "react";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { LockKeyhole, LockKeyholeOpen, ArrowDownRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getInvoicesQuery } from "@/features/invoices/server/functions";
import { getExpensesQuery } from "@/features/expenses/server/functions";
import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import { expenseIvaCents, invoiceIvaCents } from "../lib/amounts";
import { getIvaQuery, reopenQuarterMutation } from "../server/functions";
import { CloseQuarterDialog } from "../components/close-quarter-dialog";
import { closeBlocker, formatCents, periodOf, type IvaQuarter } from "../lib/quarters";

const monthLabels = ["January – March", "April – June", "July – September", "October – December"];

export default function IvaView() {
  const { data: ledger, isError, refetch } = useSuspenseQuery(getIvaQuery);
  const { data: invoices } = useSuspenseQuery(getInvoicesQuery);
  const { data: expenses } = useSuspenseQuery(getExpensesQuery);
  const years = [...new Set(ledger.map((q) => q.year))].sort((a, b) => b - a);
  const [chosenYear, setYear] = useState(new Date().getFullYear());
  const year = years.includes(chosenYear) ? chosenYear : years[0]!;
  const [selectedQuarter, setQuarter] = useState<number | null>(null);
  const [closing, setClosing] = useState<number | null>(null);
  const [reopening, setReopening] = useState<number | null>(null);
  const quarters = ledger.filter((q) => q.year === year);
  const selected = quarters.find((q) => q.quarter === selectedQuarter);
  const closingQuarter = quarters.find((q) => q.quarter === closing);
  const reopeningQuarter = quarters.find((q) => q.quarter === reopening);
  const totals = quarters.reduce(
    (sum, q) => ({
      sales: sum.sales + q.salesCents,
      deductions: sum.deductions + q.deductionsCents,
      payment: sum.payment + q.payableCents,
      closed: sum.closed + Number(q.status === "closed"),
    }),
    { sales: 0, deductions: 0, payment: 0, closed: 0 },
  );
  const records = [
    ...invoices.map((i) => ({
      id: i.id,
      name: i.name,
      date: i.createdAt,
      kind: "Invoice",
      status: i.status,
      value: i.status === "cancelled" ? 0 : invoiceIvaCents(i.value),
    })),
    ...expenses.map((e) => ({
      id: e.id,
      name: e.title,
      date: e.createdAt,
      kind: "Expense",
      status: e.iva ? "Deductible" : "Without IVA",
      value: -expenseIvaCents(e.value, e.iva),
    })),
  ]
    .filter((record) => {
      const p = periodOf(record.date);
      return p.year === year && (selectedQuarter === null || p.quarter === selectedQuarter);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">IVA</h1>
        </div>
        <div className="space-y-1">
          <label htmlFor="iva-year" className="block text-xs text-muted-foreground">
            Tax year
          </label>
          <select
            id="iva-year"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
              setQuarter(null);
            }}
            className="rounded-lg border bg-background px-4 py-2 text-sm font-medium"
          >
            {years.map((y) => (
              <option key={y}>{y}</option>
            ))}
          </select>
        </div>
      </header>
      {isError ? (
        <div role="alert" className="flex items-center gap-3 text-destructive">
          Could not refresh IVA.{" "}
          <Button variant="outline" onClick={() => void refetch()}>
            Retry
          </Button>
        </div>
      ) : null}
      <section
        aria-label="Annual IVA summary"
        className="grid overflow-hidden rounded-xl border bg-card sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ["Invoice IVA", totals.sales],
          ["Expense deductions", totals.deductions],
          ["Quarterly payments", totals.payment],
        ].map(([label, value]) => (
          <div key={label} className="border-b p-5 sm:border-r xl:border-b-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">
              {formatCents(Number(value))}
            </p>
          </div>
        ))}
        <div className="bg-primary/5 p-5">
          <p className="text-xs text-muted-foreground">Reconciliation progress</p>
          <p className="mt-3 text-2xl font-semibold tabular-nums">
            {totals.closed}
            <span className="text-base font-normal text-muted-foreground">
              {" "}
              / 4 quarters closed
            </span>
          </p>
        </div>
      </section>
      <div className="flex flex-wrap gap-2" role="group" aria-label="IVA period">
        <Button
          variant={selectedQuarter === null ? "default" : "outline"}
          aria-pressed={selectedQuarter === null}
          onClick={() => setQuarter(null)}
        >
          Entire year
        </Button>
        {quarters.map((q) => (
          <Button
            key={q.quarter}
            variant={selectedQuarter === q.quarter ? "default" : "outline"}
            aria-pressed={selectedQuarter === q.quarter}
            onClick={() => setQuarter(q.quarter)}
          >
            Q{q.quarter}
          </Button>
        ))}
      </div>
      <div className={`grid gap-4 ${selected ? "" : "md:grid-cols-2 xl:grid-cols-4"}`}>
        {(selected ? [selected] : quarters).map((q) => (
          <QuarterCard
            key={q.quarter}
            quarter={q}
            onClose={() => setClosing(q.quarter)}
            onReopen={() => setReopening(q.quarter)}
          />
        ))}
      </div>
      <section className="overflow-hidden rounded-xl border bg-card" aria-labelledby="iva-records">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-4">
          <h2 id="iva-records" className="font-semibold">
            {selected ? `Q${selected.quarter}` : year} invoices and expenses
          </h2>
          <span className="text-xs text-muted-foreground">
            Document dates determine the quarter
          </span>
        </div>
        {records.length ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-muted/40 text-xs text-muted-foreground">
                <tr>
                  {["Document", "Date", "Type", "Status", "IVA impact"].map((label) => (
                    <th key={label} scope="col" className="px-5 py-3 font-medium last:text-right">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {records.map((r) => (
                  <tr key={`${r.kind}-${r.id}`}>
                    <th scope="row" className="max-w-sm break-words px-5 py-4 font-medium">
                      {r.name}
                    </th>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(r.date).toISOString().slice(0, 10)}
                    </td>
                    <td className="px-5 py-4">{r.kind}</td>
                    <td
                      className={`px-5 py-4 capitalize ${r.status === "pending" ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}
                    >
                      {r.status}
                    </td>
                    <td className="px-5 py-4 text-right whitespace-nowrap tabular-nums">
                      {formatCents(r.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-12 text-center text-sm text-muted-foreground">
            No invoices or expenses in this period.
          </p>
        )}
      </section>
      {closingQuarter ? (
        <CloseQuarterDialog
          key={`${year}-${closing}`}
          quarter={closingQuarter}
          onClose={() => setClosing(null)}
        />
      ) : null}
      {reopeningQuarter ? (
        <ReopenDialog quarter={reopeningQuarter} onClose={() => setReopening(null)} />
      ) : null}
    </div>
  );
}

function QuarterCard({
  quarter: q,
  onClose,
  onReopen,
}: {
  quarter: IvaQuarter;
  onClose: () => void;
  onReopen: () => void;
}) {
  const closed = q.status === "closed";
  const blocker = closeBlocker(q);
  return (
    <section
      className={`flex flex-col rounded-xl border bg-card p-5 ${closed ? "border-primary/30" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Q{q.quarter}</h2>
        <span
          className={`inline-flex items-center gap-1.5 text-xs ${closed ? "text-primary" : "text-muted-foreground"}`}
        >
          {closed ? <LockKeyhole size={13} /> : <LockKeyholeOpen size={13} />}
          {closed ? "Closed" : q.governmentCents !== null ? "Reopened" : "Open"}
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{monthLabels[q.quarter - 1]}</p>
      <p className="mt-6 text-3xl font-semibold tracking-tight tabular-nums">
        {formatCents(q.payableCents)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {closed ? "Confirmed government payment" : "Calculated IVA payment"}
      </p>
      <dl className="my-5 space-y-2 text-xs tabular-nums">
        {[
          ["Invoice IVA", q.salesCents],
          ["Expense deductions", q.deductionsCents],
          ["From previous quarter", q.carryInCents],
        ].map(([label, value]) => (
          <div key={label} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{formatCents(Number(value))}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-2 border-t pt-3">
          <dt className="inline-flex items-center gap-1 text-muted-foreground">
            <ArrowDownRight size={13} />
            To next quarter
          </dt>
          <dd className="font-medium">{formatCents(q.carryOutCents)}</dd>
        </div>
      </dl>
      {q.governmentCents !== null && !closed ? (
        <p className="mb-3 text-xs text-muted-foreground">
          Original payment: {formatCents(q.governmentCents)}. Original carryover:{" "}
          {formatCents(q.confirmedCarryOutCents ?? 0)}.
        </p>
      ) : null}
      <div className="mt-auto space-y-3">
        {!closed && blocker ? (
          <p className="text-xs text-amber-800 dark:text-amber-300">{blocker}</p>
        ) : null}
        <Button
          className="w-full"
          variant={closed ? "outline" : "default"}
          onClick={closed ? onReopen : onClose}
          disabled={!closed && Boolean(blocker)}
        >
          {closed ? "Reopen quarter" : "Close quarter"}
        </Button>
      </div>
    </section>
  );
}
function ReopenDialog({ quarter, onClose }: { quarter: IvaQuarter; onClose: () => void }) {
  const mutation = useMutation(reopenQuarterMutation);
  const client = useQueryClient();
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent showCloseButton={!mutation.isPending}>
        <DialogHeader>
          <DialogTitle>
            Reopen Q{quarter.quarter} {quarter.year}?
          </DialogTitle>
          <DialogDescription>
            Invoices and expenses will become editable. The linked IVA payment transaction will be
            deleted and the account balance will update. Closing again will ask for a payment
            account and date when IVA is due. The original government amount and deduction carried
            forward must still match. Later quarters will stay closed.
          </DialogDescription>
        </DialogHeader>
        {mutation.error ? (
          <p role="alert" className="text-sm text-destructive">
            {mutation.error.message}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button variant="outline" disabled={mutation.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={async () => {
              try {
                await mutation.mutateAsync({
                  year: quarter.year,
                  quarter: quarter.quarter,
                });
                await invalidateAccountData(client);
                toast.success("Quarter reopened");
                onClose();
              } catch {
                /* Render mutation error above. */
              }
            }}
          >
            {mutation.isPending ? "Reopening..." : "Reopen quarter"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
