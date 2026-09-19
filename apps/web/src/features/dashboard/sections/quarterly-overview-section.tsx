import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getQuarterlyMetricsQuery } from "../server/quarterly-metrics";
import QuarterSelector from "../components/quarter-selector";
import QuarterComparisonTable from "../components/quarter-comparison-table";
import QuarterBreakdown from "../components/quarter-breakdown";

export default function QuarterlyOverviewSection() {
  const [selection, setSelected] = useState<number | null>(null);

  const { data } = useSuspenseQuery(getQuarterlyMetricsQuery());

  const selected = selection ?? data.selectedQuarter;
  const quarter = data.quarters[selected]!;
  const previous = data.quarters[selected - 1];

  return (
    <section aria-labelledby="quarter-heading" className="rounded-xl border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 id="quarter-heading" className="text-lg font-semibold">
            Quarter by quarter
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Compare invoices, expenses and IVA for each quarter.
          </p>
        </div>
        <QuarterSelector quarters={data.quarters} selected={selected} onSelect={setSelected} />
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
        <QuarterComparisonTable
          year={data.year}
          quarters={data.quarters}
          selected={selected}
          onSelect={setSelected}
        />
        <QuarterBreakdown quarter={quarter} previous={previous} />
      </div>
    </section>
  );
}
