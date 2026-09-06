import { euro } from "@/lib/utils";

type DistributionEstimateSectionProps = { profit: number; irc: number };

export default function DistributionEstimateSection({
  profit,
  irc,
}: DistributionEstimateSectionProps) {
  const available = Number(Math.max(0, profit - irc).toFixed(2));
  const irs = Number((available * 0.28).toFixed(2));
  const net = available - irs;

  return (
    <section
      aria-labelledby="distribution-heading"
      className="overflow-hidden rounded-xl border bg-card"
    >
      <div className="grid lg:grid-cols-[1.2fr_1fr]">
        <div className="p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Profit distribution
          </p>
          <h2 id="distribution-heading" className="mt-2 text-xl font-semibold">
            What you receive
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            Your full share of company profit after IRC and a 28% IRS deduction.
          </p>
          <dl className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Company profit</dt>
              <dd className="tabular-nums">{euro(profit)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Estimated IRC</dt>
              <dd className="tabular-nums">−{euro(irc)}</dd>
            </div>
            <div className="flex justify-between gap-4 border-t pt-3 font-medium">
              <dt>Available after IRC</dt>
              <dd className="tabular-nums">{euro(available)}</dd>
            </div>
            <div className="flex justify-between gap-4 text-muted-foreground">
              <dt>IRS deduction · 28%</dt>
              <dd className="tabular-nums">−{euro(irs)}</dd>
            </div>
          </dl>
        </div>
        <div
          className="flex flex-col justify-center items-center border-t bg-primary/5 p-5 sm:p-6 lg:border-t-0 lg:border-l"
          aria-live="polite"
        >
          <p className="text-sm font-medium">Estimated net amount for you</p>
          <p className="mt-3 text-4xl font-semibold tracking-tight text-primary tabular-nums sm:text-5xl">
            {euro(net)}
          </p>
        </div>
      </div>
    </section>
  );
}
