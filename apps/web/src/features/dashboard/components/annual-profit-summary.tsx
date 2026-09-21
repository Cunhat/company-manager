import { IconBuildingBank, IconChevronDown, IconWallet } from "@tabler/icons-react";
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
            Your estimated taxes and take-home profit.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">As of {data.asOf}</span>
      </header>

      <div className="grid divide-y sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <div className="p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IconBuildingBank size={18} stroke={2} aria-hidden="true" /> IRC to pay
          </div>
          <p className="mt-4 break-words text-3xl font-semibold tracking-tight tabular-nums lg:text-4xl">
            {formatCents(actual.ircCents)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Estimated IRC on company profit so far.
          </p>
        </div>
        <div className="bg-primary/5 p-5 sm:p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <IconWallet size={18} stroke={2} aria-hidden="true" /> You receive after IRS
          </div>
          <p className="mt-4 break-words text-3xl font-semibold tracking-tight text-primary tabular-nums lg:text-4xl">
            {formatCents(actual.netDividendCents)}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Profit after IRC and dividend IRS, if distributed to you.
          </p>
        </div>
      </div>

      <section aria-labelledby="salary-profit-heading" className="border-t p-5 sm:p-6">
        <h3 id="salary-profit-heading" className="text-base font-semibold">
          Salary + profit
        </h3>
        <dl className="mt-4 space-y-4 text-sm">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <dt className="text-muted-foreground">Net salary received this year</dt>
            <dd className="font-medium tabular-nums">{formatCents(actual.salaryReceivedCents)}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <dt className="text-muted-foreground">Profit after taxes</dt>
            <dd className="font-medium tabular-nums">{formatCents(actual.netDividendCents)}</dd>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-t pt-4">
            <dt className="font-semibold">Total including salaries</dt>
            <dd className="break-words text-2xl font-semibold tracking-tight text-primary tabular-nums sm:text-3xl">
              {formatCents(actual.personalTotalCents)}
            </dd>
          </div>
        </dl>
      </section>

      {!data.hasActivity ? (
        <p className="border-t bg-muted/30 px-5 py-4 text-sm text-muted-foreground sm:px-6">
          No paid invoices, expenses or salary records to include yet this year.
        </p>
      ) : null}

      {actual.profitCents < 0 ? (
        <p className="border-t bg-muted/30 px-5 py-4 text-sm sm:px-6">
          The company has a {formatCents(-actual.profitCents)} loss so far. Your total includes
          salary already received; no profit is available to distribute.
        </p>
      ) : null}

      <details className="group border-t">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none sm:px-6 [&::-webkit-details-marker]:hidden">
          View calculation
          <IconChevronDown
            size={18}
            stroke={1.5}
            aria-hidden="true"
            className="shrink-0 group-open:rotate-180"
          />
        </summary>
        <div className="overflow-x-auto border-t">
          <table className="w-full text-sm">
            <caption className="sr-only">
              Profit and tax breakdown for {data.year} through {data.asOf}
            </caption>
            <thead className="bg-muted/30 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 text-left font-medium sm:px-6">
                  How it adds up
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium sm:px-6">
                  Today
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={row.subtotal ? "border-t font-medium" : "text-muted-foreground"}
                >
                  <th scope="row" className="px-5 py-3 text-left font-[inherit] sm:px-6">
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
      </details>
    </section>
  );
}
