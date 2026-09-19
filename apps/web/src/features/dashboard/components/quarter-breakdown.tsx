import { euro } from "@/lib/utils";
import type { DashboardQuarter } from "../lib/quarterly-metrics";

type QuarterBreakdownProps = {
  quarter: DashboardQuarter;
  previous?: DashboardQuarter;
};

export default function QuarterBreakdown({
  quarter,
  previous,
}: QuarterBreakdownProps) {
  const netIva = quarter.collected - quarter.deductible;
  return (
    <div className="rounded-lg bg-muted/50 p-5" aria-live="polite">
      <div className="flex justify-between gap-2">
        <h3 className="font-semibold">{quarter.id} · Breakdown</h3>
        <span className="text-xs text-muted-foreground">{quarter.status}</span>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt>Invoices excluding IVA</dt>
          <dd className="font-medium tabular-nums">{euro(quarter.invoices)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt>Expenses excluding IVA</dt>
          <dd className="font-medium tabular-nums">{euro(quarter.expenses)}</dd>
        </div>
      </dl>
      <div className="mt-5 border-t pt-4">
        <h4 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          IVA
        </h4>
        <dl className="mt-3 space-y-3 text-sm">
          <div className="flex justify-between">
            <dt>IVA on sales</dt>
            <dd className="tabular-nums">{euro(quarter.collected)}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Deductible purchase IVA</dt>
            <dd className="tabular-nums">−{euro(quarter.deductible)}</dd>
          </div>
          <div className="flex justify-between border-t pt-3 font-semibold">
            <dt>
              {netIva < 0 ? "Estimated IVA credit" : "Estimated IVA to pay"}
            </dt>
            <dd className="text-xl tabular-nums">{euro(Math.abs(netIva))}</dd>
          </div>
        </dl>
      </div>
      <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
        <p>
          File by{" "}
          <span className="font-medium text-foreground">{quarter.filing}</span>
        </p>
        <p className="mt-2">
          Pay by{" "}
          <span className="font-medium text-foreground">{quarter.payment}</span>
        </p>
      </div>
      {previous && quarter.status === "Complete" ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Compared with {previous.id}: sales{" "}
          {euro(Math.abs(quarter.invoices - previous.invoices))}{" "}
          {quarter.invoices >= previous.invoices ? "higher" : "lower"}, expenses{" "}
          {euro(Math.abs(quarter.expenses - previous.expenses))}{" "}
          {quarter.expenses >= previous.expenses ? "higher" : "lower"}.
        </p>
      ) : null}
      {quarter.id === "Q4" ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Q4 deadlines fall in the following year and include weekend
          adjustments.
        </p>
      ) : null}
    </div>
  );
}
