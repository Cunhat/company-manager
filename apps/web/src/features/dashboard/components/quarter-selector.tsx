import type { DashboardQuarter } from "../lib/quarterly-metrics";

type QuarterSelectionProps = {
  quarters: DashboardQuarter[];
  selected: number;
  onSelect: (index: number) => void;
};

export default function QuarterSelector({ quarters, selected, onSelect }: QuarterSelectionProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1" aria-label="Select quarter">
      {quarters.map((q, index) => (
        <button
          key={q.id}
          type="button"
          aria-pressed={selected === index}
          onClick={() => onSelect(index)}
          className={`rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-ring ${selected === index ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
        >
          {q.id}
        </button>
      ))}
    </div>
  );
}
