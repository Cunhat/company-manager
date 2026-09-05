import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { euro, profit } from "../data/dashboard-demo";
import IrcAssumptions from "../components/irc-assumptions";

export default function IrcEstimateSection() {
  const [showEstimate, setShowEstimate] = useState(false);
  const [pme, setPme] = useState(true);
  const irc = pme
    ? Math.min(profit, 50000) * 0.15 + Math.max(0, profit - 50000) * 0.19
    : profit * 0.19;

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
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Based on profit recorded so far. This will change as you add
            invoices and expenses. The annual settlement follows the tax year.
          </p>
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
      <button
        type="button"
        aria-expanded={showEstimate}
        aria-controls="irc-assumptions"
        onClick={() => setShowEstimate(!showEstimate)}
        className="mt-5 flex items-center gap-2 rounded text-sm font-medium text-primary focus-visible:outline-2 focus-visible:outline-ring"
      >
        How this is estimated{" "}
        <ChevronDown
          size={16}
          className={showEstimate ? "rotate-180" : ""}
          aria-hidden="true"
        />
      </button>
      {showEstimate ? (
        <IrcAssumptions pme={pme} profit={profit} onPmeChange={setPme} />
      ) : null}
    </section>
  );
}
