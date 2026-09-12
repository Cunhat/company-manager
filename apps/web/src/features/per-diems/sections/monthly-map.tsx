import { IconCalendar, IconPencil, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { formatAmount, formatTravelDate } from "@/features/kms/lib/maps";
import { allowanceCents, TYPE_LABELS } from "../lib/allowances";
import type { PerDiem } from "../schemas/types";

export function MonthlyPerDiemMap({
  entries,
  ready,
  canAdd,
  busy,
  onAdd,
  onEdit,
  onRemove,
}: {
  entries: PerDiem[];
  ready: boolean;
  canAdd: boolean;
  busy: boolean;
  onAdd: () => void;
  onEdit: (entry: PerDiem) => void;
  onRemove: (entry: PerDiem) => void;
}) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-labelledby="per-diem-map-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 id="per-diem-map-heading" className="text-sm font-semibold">
            Monthly allowances
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            One entry per day, including intermediate days away.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {ready ? "Saved" : "Loading..."}
        </span>
      </div>
      {!ready ? (
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">
          Loading saved per diems...
        </p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <IconCalendar className="mb-4 size-8 text-primary" aria-hidden="true" />
          <h3 className="font-semibold">No per diems this month</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {canAdd
              ? "Choose a mileage journey and confirm the daily allowances for your trip."
              : "Add trips in Mileage first, then use those journeys to create your per diems."}
          </p>
          {canAdd ? (
            <Button variant="outline" className="mt-5" onClick={onAdd}>
              <IconPlus data-icon="inline-start" />
              Add per diems
            </Button>
          ) : (
            <Button variant="outline" className="mt-5" render={<a href="/kms" />}>
              Open mileage
            </Button>
          )}
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Monthly per diem entries"
          tabIndex={0}
        >
          <table className="w-full min-w-[900px] text-left text-sm">
            <caption className="sr-only">Per diems ordered by travel date</caption>
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {[
                  "Date",
                  "Journey",
                  "Type",
                  "Business purpose",
                  "Description",
                  "% of daily rate",
                  "Amount",
                  "Actions",
                ].map((label, index) => (
                  <th
                    scope="col"
                    key={label}
                    className={`px-5 py-3 font-medium ${index >= 5 ? "text-right" : ""}`}
                  >
                    {label === "Actions" ? <span className="sr-only">Actions</span> : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30">
                  <td className="whitespace-nowrap px-5 py-4 text-muted-foreground tabular-nums">
                    <time dateTime={entry.date}>{formatTravelDate(entry.date)}</time>
                  </td>
                  <th scope="row" className="max-w-64 px-5 py-4 font-medium break-words">
                    {entry.sourceOrigin} → {entry.destination}
                    <span className="mt-1 block text-xs font-normal text-muted-foreground">
                      {entry.territory === "portugal" ? "Portugal" : "Abroad"}
                    </span>
                  </th>
                  <td className="px-5 py-4 text-muted-foreground">{TYPE_LABELS[entry.type]}</td>
                  <td className="max-w-xs px-5 py-4 break-words text-muted-foreground">
                    {entry.reason}
                  </td>
                  <td className="max-w-xs px-5 py-4 break-words text-muted-foreground">
                    {entry.description || "—"}
                  </td>
                  <td className="px-5 py-4 text-right tabular-nums">
                    {entry.percentage}%
                    <span className="mt-1 block whitespace-nowrap text-xs text-muted-foreground">
                      of {formatAmount(entry.dailyRateCents)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-right font-medium tabular-nums">
                    {formatAmount(allowanceCents(entry))}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        onClick={() => onEdit(entry)}
                        aria-label={`Edit per diem for ${entry.date}`}
                      >
                        <IconPencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        onClick={() => onRemove(entry)}
                        aria-label={`Remove per diem for ${entry.date}`}
                      >
                        <IconTrash className="size-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t bg-muted/30">
              <tr>
                <th scope="row" colSpan={6} className="px-5 py-4 font-medium">
                  Total per diems
                </th>
                <td className="whitespace-nowrap px-5 py-4 text-right font-semibold tabular-nums">
                  {formatAmount(entries.reduce((sum, entry) => sum + allowanceCents(entry), 0))}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
