import { euro } from "@/lib/utils";

type IrcEstimateSectionProps = {
  irc: number;
};

export default function IrcEstimateSection({ irc }: IrcEstimateSectionProps) {
  return (
    <section
      aria-labelledby="irc-heading"
      className="rounded-xl border bg-card p-5 sm:p-6 border-t-4 border-t-primary"
    >
      <div className="grid gap-6 md:grid-cols-[1fr_auto]">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            Annual company tax
          </p>
          <h2 id="irc-heading" className="mt-2 text-xl font-semibold">
            IRC estimate for 2026
          </h2>
        </div>
        <div className="md:text-right">
          <p className="text-4xl font-semibold tracking-tight tabular-nums">
            {euro(irc)}
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Basic IRC accrued · not a full-year forecast
          </p>
        </div>
      </div>
    </section>
  );
}
