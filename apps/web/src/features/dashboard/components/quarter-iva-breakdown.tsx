import { Check } from "lucide-react";
import { euro, type DashboardQuarter } from "../data/dashboard-demo";

type QuarterIvaBreakdownProps = { quarter: DashboardQuarter; previous?: DashboardQuarter };

export default function QuarterIvaBreakdown({ quarter, previous }: QuarterIvaBreakdownProps) {
  const netIva = quarter.collected - quarter.deductible;
  return (
    <div className="rounded-lg bg-muted/50 p-5" aria-live="polite">
      <div className="flex justify-between gap-2">
        <h3 className="font-semibold">{quarter.id} · IVA breakdown</h3>
        <span className="text-xs text-muted-foreground">{quarter.status}</span>
      </div>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between">
          <dt>IVA on sales</dt>
          <dd className="tabular-nums">{euro(quarter.collected)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Deductible purchase IVA</dt>
          <dd className="tabular-nums">−{euro(quarter.deductible)}</dd>
        </div>
        <div className="flex justify-between">
          <dt>Prior credits / adjustments</dt>
          <dd>€0</dd>
        </div>
        <div className="flex justify-between border-t pt-3 font-semibold">
          <dt>
            {quarter.status === "Paid"
              ? "IVA settled"
              : quarter.complete
                ? "IVA to pay"
                : "Estimated IVA so far"}
          </dt>
          <dd className="text-xl tabular-nums">{euro(netIva)}</dd>
        </div>
      </dl>
      <div className="mt-5 border-t pt-4 text-xs text-muted-foreground">
        <p>
          File by <span className="font-medium text-foreground">{quarter.filing}</span>
        </p>
        <p className="mt-2">
          Pay by <span className="font-medium text-foreground">{quarter.payment}</span>
        </p>
        {quarter.status === "Paid" ? (
          <p className="mt-3 flex items-center gap-1 text-primary">
            <Check size={14} aria-hidden="true" /> Payment recorded in sample data
          </p>
        ) : null}
      </div>
      {previous && quarter.complete ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Compared with {previous.id}: sales {euro(quarter.sales - previous.sales)} higher, expenses{" "}
          {euro(quarter.expenses - previous.expenses)} higher.
        </p>
      ) : null}
      {quarter.id === "Q4" ? (
        <p className="mt-4 text-xs text-muted-foreground">
          *2027 dates follow the standard rules and weekend adjustment; confirm the published
          calendar.
        </p>
      ) : null}
    </div>
  );
}
