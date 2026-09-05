import { demoQuarters, euro } from "../data/dashboard-demo";

type QuarterSelectionProps = { selected: number; onSelect: (index: number) => void };

export default function QuarterComparisonTable({ selected, onSelect }: QuarterSelectionProps) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full min-w-[440px] text-left text-sm">
        <caption className="sr-only">2026 quarterly sales, expenses and net IVA, in euros</caption>
        <thead className="text-xs text-muted-foreground">
          <tr>
            <th className="pb-3 font-normal">Period</th>
            <th className="pb-3 text-right font-normal">Sales</th>
            <th className="pb-3 text-right font-normal">Expenses</th>
            <th className="pb-3 text-right font-normal">Net IVA</th>
          </tr>
        </thead>
        <tbody>
          {demoQuarters.map((q, i) => (
            <tr key={q.id} className={`border-t ${selected === i ? "bg-primary/5" : ""}`}>
              <th scope="row" className="py-4 pr-3 font-medium">
                <button
                  type="button"
                  onClick={() => onSelect(i)}
                  className="rounded text-left focus-visible:outline-2 focus-visible:outline-ring"
                >
                  {q.id}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">{q.period}</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    {q.status}
                  </span>
                </button>
              </th>
              <td className="text-right tabular-nums">
                {q.status === "Not started" ? "—" : euro(q.sales)}
              </td>
              <td className="text-right tabular-nums">
                {q.status === "Not started" ? "—" : euro(q.expenses)}
              </td>
              <td className="text-right font-medium tabular-nums">
                {q.status === "Not started" ? "—" : euro(q.collected - q.deductible)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-4 text-xs text-muted-foreground">
        Sales and expenses exclude IVA. Q3 is partial; Q4 has not started.
      </p>
    </div>
  );
}
