import { IconBuildingBank, IconWallet } from "@tabler/icons-react";
import { formatCents } from "@/features/iva/lib/quarters";
import type { AnnualProfit } from "../lib/annual-profit";

export default function AnnualProfitSummary({ data }: { data: AnnualProfit }) {
  const { actual } = data;
  const rows = [
    {
      label: "Paid invoices, excluding IVA",
      actual: actual.revenueCents,
    },
    {
      label: "Operating expenses, excluding deductible IVA",
      actual: -actual.expensesCents,
    },
    { label: "Full payroll cost", actual: -actual.payrollCents },
    {
      label: "Company profit before IRC",
      actual: actual.profitCents,
      subtotal: true,
    },
    { label: "Estimated IRC", actual: -actual.ircCents },
    {
      label: "Company profit after IRC",
      actual: actual.afterIrcCents,
      subtotal: true,
    },
    {
      label: "Dividend IRS · 28%",
      actual: -actual.dividendIrsCents,
    },
    {
      label: "Net profit available to you",
      actual: actual.netDividendCents,
      subtotal: true,
    },
    {
      label: "Net salary received",
      actual: actual.salaryReceivedCents,
    },
    {
      label: "Your personal total",
      actual: actual.personalTotalCents,
      total: true,
    },
  ];

  return (
    <section
      aria-labelledby="annual-profit-heading"
      className="overflow-hidden rounded-xl bg-card shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_1px_2px_-1px_oklch(0_0_0/0.06),0_2px_4px_oklch(0_0_0/0.04)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.08)]"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b p-5 sm:p-6">
        <div>
          <h2 id="annual-profit-heading" className="text-xl font-semibold">
            Profit so far · {data.year}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            Company profit after costs and estimated IRC, and your personal
            total including net salary received.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">As of {data.asOf}</span>
      </header>

      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IconBuildingBank size={18} stroke={2} aria-hidden="true" /> Company
            profit so far
          </div>
          <p className="mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums lg:text-4xl">
            {formatCents(actual.afterIrcCents)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            After operating expenses, full payroll costs and{" "}
            {formatCents(actual.ircCents)} in estimated IRC.
          </p>
        </div>
        <div className="bg-primary/5 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IconWallet size={18} stroke={2} aria-hidden="true" /> Personal
            total today
          </div>
          <p className="mt-4 break-words text-3xl font-semibold tracking-tight text-primary tabular-nums lg:text-4xl">
            {formatCents(actual.personalTotalCents)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {formatCents(actual.salaryReceivedCents)} received in salary +{" "}
            {formatCents(actual.netDividendCents)} if profit is distributed.
          </p>
        </div>
      </div>

      {!data.hasActivity ? (
        <p className="border-t bg-muted/30 px-5 py-4 text-sm text-muted-foreground sm:px-6">
          No paid invoices, expenses or salary records to include yet this year.
        </p>
      ) : null}

      {actual.profitCents < 0 ? (
        <p className="border-t bg-muted/30 px-5 py-4 text-sm sm:px-6">
          The company has a {formatCents(-actual.profitCents)} loss so far. Your
          total includes salary already received; no profit is available to
          distribute.
        </p>
      ) : null}

      <div className="overflow-x-auto border-t">
        <table className="w-full text-sm">
          <caption className="sr-only">
            Profit and tax breakdown for {data.year} through {data.asOf}
          </caption>
          <thead className="bg-muted/30 text-xs text-muted-foreground">
            <tr>
              <th
                scope="col"
                className="px-5 py-3 text-left font-medium sm:px-6"
              >
                How it adds up
              </th>
              <th
                scope="col"
                className="px-5 py-3 text-right font-medium sm:px-6"
              >
                Today
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={
                  row.total
                    ? "border-t bg-primary/5 font-semibold"
                    : row.subtotal
                      ? "border-t font-medium"
                      : "text-muted-foreground"
                }
              >
                <th
                  scope="row"
                  className="px-5 py-3 text-left font-[inherit] sm:px-6"
                >
                  {row.label}
                </th>
                <td className="whitespace-nowrap px-5 py-3 text-right tabular-nums sm:px-6">
                  {formatCents(row.actual)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
