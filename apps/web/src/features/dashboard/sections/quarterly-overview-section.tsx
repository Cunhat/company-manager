import { useState } from "react";
import { demoQuarters } from "../data/dashboard-demo";
import QuarterSelector from "../components/quarter-selector";
import QuarterComparisonTable from "../components/quarter-comparison-table";
import QuarterIvaBreakdown from "../components/quarter-iva-breakdown";

export default function QuarterlyOverviewSection() {
  const [selected, setSelected] = useState(1);
  const quarter = demoQuarters[selected]!;
  const previous = demoQuarters[selected - 1];

  return (
    <section
      aria-labelledby="quarter-heading"
      className="rounded-xl border bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="quarter-heading" className="text-lg font-semibold">
            Quarter by quarter
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare activity and inspect each IVA obligation.
          </p>
        </div>
        <QuarterSelector selected={selected} onSelect={setSelected} />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <QuarterComparisonTable selected={selected} onSelect={setSelected} />
        <QuarterIvaBreakdown quarter={quarter} previous={previous} />
      </div>
    </section>
  );
}
