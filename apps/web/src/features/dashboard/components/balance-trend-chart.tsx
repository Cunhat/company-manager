import { moneyFormatter } from "@/features/accounts/lib/format";
import type { buildBalanceTrend } from "../lib/balance-trend";

type Trend = ReturnType<typeof buildBalanceTrend>;
const money = (cents: number) => moneyFormatter.format(cents / 100);
const monthLabel = (month: string) =>
  new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${month}-01T00:00:00Z`),
  );

export default function BalanceTrendChart({ trend }: { trend: Trend }) {
  const balances = trend.points.map((point) => point.balanceCents);
  const minimum = Math.min(...balances);
  const maximum = Math.max(...balances);
  const range = maximum - minimum || Math.max(Math.abs(maximum) * 0.1, 10_000);
  const lower = minimum - range * 0.15;
  const upper = maximum + range * 0.15;
  const coordinates = trend.points.map((point, index) => ({
    x: 12 + (index * 536) / (trend.points.length - 1),
    y: 144 - ((point.balanceCents - lower) / (upper - lower)) * 128,
  }));
  const line = coordinates
    .map(({ x, y }, index) => `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`)
    .join(" ");
  const area = `${line} L548 144 L12 144 Z`;
  const change = trend.changeCents;

  return (
    <figure className="mt-auto border-t pt-5">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Balance over time</span>
        <span
          className={`text-sm font-semibold tabular-nums ${change < 0 ? "text-destructive" : change > 0 ? "text-primary" : "text-muted-foreground"}`}
        >
          {change > 0 ? "+" : change < 0 ? "−" : ""}
          {money(Math.abs(change))}
        </span>
      </figcaption>
      <p className="mt-1 text-xs text-muted-foreground">Last 6 months</p>
      <svg
        viewBox="0 0 560 160"
        preserveAspectRatio="none"
        className="mt-4 h-36 w-full overflow-visible"
        aria-hidden="true"
      >
        {[16, 80, 144].map((y) => (
          <line
            key={y}
            x1="12"
            x2="548"
            y1={y}
            y2={y}
            stroke="currentColor"
            strokeDasharray="3 6"
            className="text-border"
          />
        ))}
        <path d={area} fill="var(--primary)" fillOpacity="0.1" />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {coordinates.map(({ x, y }, index) => (
          <circle
            key={trend.points[index]!.month}
            cx={x}
            cy={y}
            r={index === coordinates.length - 1 ? 4 : 2.5}
            fill="var(--card)"
            stroke="var(--primary)"
            strokeWidth="2"
          >
            <title>
              {monthLabel(trend.points[index]!.month)}: {money(trend.points[index]!.balanceCents)}
            </title>
          </circle>
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-xs text-muted-foreground">
        <span>{monthLabel(trend.points[0]!.month)}</span>
        <span>{monthLabel(trend.points[trend.points.length - 1]!.month)}</span>
      </div>
      {!trend.hasMovement ? (
        <p className="mt-3 text-xs text-muted-foreground">
          No recorded balance changes in this period.
        </p>
      ) : null}
      <table className="sr-only">
        <caption>Monthly balance over the last six months</caption>
        <tbody>
          {trend.points.map((point) => (
            <tr key={point.month}>
              <th scope="row">{monthLabel(point.month)}</th>
              <td>{money(point.balanceCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
