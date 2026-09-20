import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  IconCircleArrowUpRightFilled,
  IconCheckFilled,
  IconCaretLeftFilled,
  IconCaretRightFilled,
  IconPlusFilled,
  IconPencilFilled,
  IconSettingsFilled,
  IconCashBanknoteFilled,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getAccountsQuery } from "@/features/accounts/server/functions";
import dayjs from "@/features/kms/lib/dates";
import { getSalaryQuery, type SalaryRecord } from "../server/functions";
import {
  KIND_LABELS,
  money,
  monthLabel,
  PAYMENT_LABELS,
} from "../lib/calculations";
import { payrollMonthSchema, type PaymentKind } from "../schemas/validators";
import { SalaryBreakdown } from "../components/salary-editor";
import {
  GenerateDialog,
  PaymentDialog,
  SettingsDialog,
  EditSalaryDialog,
} from "../components/payroll-dialogs";

const authedRoute = getRouteApi("/_authed");
export default function SalaryView() {
  const { session } = authedRoute.useRouteContext();
  return <SalaryWorkspace key={session.user.id} userId={session.user.id} />;
}

export function SalaryWorkspace({ userId }: { userId: string }) {
  const [tab, setTab] = useState<string | number | null>("generate");
  const [historyYear, setHistoryYear] = useState(() => dayjs().year());
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"settings" | "generate" | null>(null);
  const [editing, setEditing] = useState<SalaryRecord | null>(null);
  const [paymentTarget, setPaymentTarget] = useState<{
    record: SalaryRecord;
    kind: PaymentKind;
  } | null>(null);
  const client = useQueryClient();
  const query = useQuery(getSalaryQuery(userId));
  const accounts = useQuery(getAccountsQuery);
  const data = query.data;
  async function refresh() {
    await Promise.all(
      [
        "salary",
        "salary-travel",
        "expenses",
        "transactions",
        "quarterly-metrics",
        "accounts",
        "yearly-invoices-and-expenses",
        "iva",
        "payroll-lock",
      ].map((key) => client.invalidateQueries({ queryKey: [key] })),
    );
  }
  if (!data)
    return (
      <div
        className="rounded-xl border p-8"
        role={query.isError ? "alert" : "status"}
      >
        {query.isError ? (
          <>
            <p>Could not load salary records.</p>
            <Button
              className="mt-4"
              variant="outline"
              onClick={() => void query.refetch()}
            >
              Try again
            </Button>
          </>
        ) : (
          "Loading salary..."
        )}
      </div>
    );
  const monthRecords = data.records.filter((record) => record.month === month);
  const selected =
    monthRecords.find((r) => r.id === selectedId) ??
    monthRecords.find((r) => r.kind === "monthly") ??
    monthRecords[0];
  const yearRecords = data.records.filter(
    (r) => r.month.slice(0, 4) === String(historyYear),
  );
  const paidIds = new Set(data.payments.map((p) => `${p.recordId}:${p.kind}`));
  const paidCount = (r: SalaryRecord) =>
    (["salary", "ss", "irs"] as const).filter(
      (kind) =>
        paidIds.has(`${r.id}:${kind}`) ||
        (kind === "salary"
          ? r.netCents
          : kind === "ss"
            ? r.ssCents + r.tsuCents
            : r.irsCents) === 0,
    ).length;

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Salary</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setDialog("settings")}>
            <IconSettingsFilled data-icon="inline-start" />
            Salary settings
          </Button>
          {tab === "generate" ? (
            <Button
              onClick={() => setDialog(data.settings ? "generate" : "settings")}
            >
              <IconPlusFilled data-icon="inline-start" />
              {data.settings ? "Generate payroll" : "Set up salary"}
            </Button>
          ) : null}
        </div>
      </div>
      {query.isError ? (
        <p
          role="alert"
          className="rounded-lg border border-destructive/30 p-3 text-sm"
        >
          Could not refresh payroll.{" "}
          <button className="underline" onClick={() => void query.refetch()}>
            Try again
          </button>
        </p>
      ) : null}

      <Tabs
        value={tab}
        onValueChange={setTab}
        className="flex min-w-0 flex-col gap-6"
      >
        <TabsList aria-label="Salary sections">
          <TabsTrigger value="generate">Generate salaries</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="generate" className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() =>
                  setMonth(dayjs(month).subtract(1, "month").format("YYYY-MM"))
                }
              >
                <IconCaretLeftFilled />
              </Button>
              <label className="sr-only" htmlFor="salary-month">
                Salary month
              </label>
              <Input
                id="salary-month"
                className="w-44"
                type="month"
                value={month}
                onChange={(e) => {
                  if (payrollMonthSchema.safeParse(e.target.value).success)
                    setMonth(e.target.value);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() =>
                  setMonth(dayjs(month).add(1, "month").format("YYYY-MM"))
                }
              >
                <IconCaretRightFilled />
              </Button>
            </div>
            <div
              className="flex flex-wrap gap-2"
              role="group"
              aria-label="Records in this month"
            >
              {monthRecords.map((record) => (
                <Button
                  key={record.id}
                  variant={selected?.id === record.id ? "secondary" : "ghost"}
                  aria-pressed={selected?.id === record.id}
                  onClick={() => setSelectedId(record.id)}
                >
                  {KIND_LABELS[record.kind]}
                </Button>
              ))}
            </div>
          </div>
          {selected ? (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b px-6 py-5">
                <div>
                  <h2 className="font-semibold">{monthLabel(month)}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {KIND_LABELS[selected.kind]} ·{" "}
                    {selected.kind === "monthly"
                      ? "Travel month closed"
                      : "Extra salary payment"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  disabled={query.isError}
                  onClick={() => setEditing(selected)}
                >
                  <IconPencilFilled data-icon="inline-start" />
                  Edit
                </Button>
              </div>
              <div className="grid lg:grid-cols-[1fr_1fr]">
                <div className="p-6 lg:p-8">
                  <SalaryBreakdown
                    values={selected}
                    kind={selected.kind}
                    travel={selected}
                  />
                </div>
                <div className="border-t bg-muted/15 p-6 lg:border-t-0 lg:border-l lg:p-8">
                  <div className="mb-5 flex justify-between gap-3">
                    <h3 className="text-sm font-semibold">Payment checklist</h3>
                    <span className="text-xs text-muted-foreground">
                      {paidCount(selected)} of 3 settled
                    </span>
                  </div>
                  <div className="space-y-3">
                    {(["salary", "ss", "irs"] as const).map((kind) => {
                      const payment = data.payments.find(
                        (p) => p.recordId === selected.id && p.kind === kind,
                      );
                      const amount =
                        kind === "salary"
                          ? selected.netCents
                          : kind === "ss"
                            ? selected.ssCents + selected.tsuCents
                            : selected.irsCents;
                      return (
                        <div
                          key={kind}
                          className="rounded-xl border bg-card p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-medium">
                                {PAYMENT_LABELS[kind]}
                              </p>
                              <p className="mt-1 text-xl font-semibold tabular-nums">
                                {money(amount)}
                              </p>
                            </div>
                            <span
                              className={`rounded-md px-2 py-1 text-xs ${payment || !amount ? "bg-primary/10 text-primary dark:text-teal-300" : "bg-muted text-muted-foreground"}`}
                            >
                              {payment
                                ? "Paid"
                                : !amount
                                  ? "Not due"
                                  : "Unpaid"}
                            </span>
                          </div>
                          {kind === "ss" ? (
                            <p className="mt-2 text-xs text-muted-foreground">
                              {money(selected.ssCents)} employee SS +{" "}
                              {money(selected.tsuCents)} employer TSU
                            </p>
                          ) : null}
                          {payment ? (
                            <div className="mt-3 flex items-end justify-between gap-3">
                              <p className="text-xs text-muted-foreground">
                                <IconCheckFilled className="mr-1 inline size-3.5" />
                                {dayjs
                                  .utc(payment.paidAt)
                                  .format("DD MMM YYYY")}
                                <br />
                                <span className="mt-1 inline-block">
                                  {accounts.data?.find(
                                    (a) => a.id === payment.accountId,
                                  )?.name ?? "Unassigned account"}{" "}
                                  ·{" "}
                                  {kind === "salary"
                                    ? "Expense recorded"
                                    : "Expense transaction recorded"}
                                </span>
                              </p>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={query.isError}
                                onClick={() =>
                                  setPaymentTarget({ record: selected, kind })
                                }
                              >
                                Undo
                              </Button>
                            </div>
                          ) : amount > 0 ? (
                            <Button
                              className="mt-4 w-full"
                              variant="outline"
                              disabled={query.isError}
                              onClick={() =>
                                setPaymentTarget({ record: selected, kind })
                              }
                            >
                              Mark as paid
                              <IconCircleArrowUpRightFilled data-icon="inline-end" />
                            </Button>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          ) : (
            <div className="flex flex-col items-center rounded-xl border border-dashed bg-card px-6 py-16 text-center">
              <div className="mb-4 rounded-xl bg-primary/10 p-3 text-primary">
                <IconCashBanknoteFilled className="size-7" />
              </div>
              <h2 className="text-lg font-semibold">
                {data.settings
                  ? `Plan your pay for ${monthLabel(month)}`
                  : "Make room for your own salary"}
              </h2>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                {data.settings
                  ? "Review your gross salary, this month's allowances and tax payments before closing the month."
                  : "Set your gross salary, contribution rates and usual account. Then generate your monthly payroll."}
              </p>
              <Button
                className="mt-6"
                onClick={() =>
                  setDialog(data.settings ? "generate" : "settings")
                }
              >
                {data.settings ? "Preview payroll" : "Set up salary"}
              </Button>
            </div>
          )}
        </TabsContent>
        <TabsContent value="history" className="flex min-w-0 flex-col gap-6">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              aria-label="Previous history year"
              disabled={historyYear <= 1900}
              onClick={() => setHistoryYear((year) => year - 1)}
            >
              <IconCaretLeftFilled />
            </Button>
            <label htmlFor="salary-history-year" className="sr-only">
              History year
            </label>
            <Input
              id="salary-history-year"
              type="number"
              min={1900}
              max={2199}
              className="w-28"
              value={historyYear}
              onChange={(event) => {
                const year = Number(event.target.value);
                if (Number.isInteger(year) && year >= 1900 && year <= 2199)
                  setHistoryYear(year);
              }}
            />
            <Button
              variant="outline"
              size="icon"
              aria-label="Next history year"
              disabled={historyYear >= 2199}
              onClick={() => setHistoryYear((year) => year + 1)}
            >
              <IconCaretRightFilled />
            </Button>
          </div>
          {yearRecords.length ? (
            <section className="overflow-hidden rounded-xl border bg-card">
              <div className="border-b px-5 py-4">
                <h2 className="text-sm font-semibold">
                  Payroll history · {historyYear}
                </h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left text-sm">
                  <caption className="sr-only">
                    Payroll records for the selected year
                  </caption>
                  <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
                    <tr>
                      {[
                        "Period / type",
                        "Take-home pay",
                        "Company cost",
                        "Payments",
                      ].map((label, i) => (
                        <th
                          key={label}
                          scope="col"
                          className={`px-5 py-3 font-medium ${i ? "text-right" : ""}`}
                        >
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {yearRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-muted/30">
                        <th scope="row" className="px-5 py-4">
                          <button
                            className="rounded-sm text-left font-medium underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
                            onClick={() => {
                              setMonth(r.month);
                              setSelectedId(r.id);
                              setTab("generate");
                            }}
                          >
                            {monthLabel(r.month)}
                            <span className="mt-1 block text-xs font-normal text-muted-foreground">
                              {KIND_LABELS[r.kind]}
                            </span>
                          </button>
                        </th>
                        <td className="px-5 py-4 text-right tabular-nums">
                          {money(r.netCents)}
                        </td>
                        <td className="px-5 py-4 text-right tabular-nums">
                          {money(r.companyCents)}
                        </td>
                        <td className="px-5 py-4 text-right text-muted-foreground">
                          {paidCount(r)} / 3 settled
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : (
            <div className="rounded-xl border border-dashed bg-card px-6 py-16 text-center">
              <h2 className="font-semibold">
                No salary records for {historyYear}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose another year or generate your first salary.
              </p>
              <Button
                className="mt-5"
                variant="outline"
                onClick={() => setTab("generate")}
              >
                Generate salaries
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
      {dialog === "settings" ? (
        <SettingsDialog
          data={data}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      ) : null}
      {dialog === "generate" ? (
        <GenerateDialog
          userId={userId}
          month={month}
          data={data}
          onClose={() => setDialog(null)}
          onSaved={refresh}
        />
      ) : null}
      {editing ? (
        <EditSalaryDialog
          record={editing}
          hasPayments={data.payments.some((p) => p.recordId === editing.id)}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      ) : null}
      {paymentTarget ? (
        <PaymentDialog
          {...paymentTarget}
          payment={data.payments.find(
            (p) =>
              p.recordId === paymentTarget.record.id &&
              p.kind === paymentTarget.kind,
          )}
          usualAccount={data.settings?.accountId ?? ""}
          onClose={() => setPaymentTarget(null)}
          onSaved={refresh}
        />
      ) : null}
    </div>
  );
}
