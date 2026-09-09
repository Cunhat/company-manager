import { IconCalendar, IconPlus, IconTrash } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import type { KmsEntry } from "../schemas/types";
import { formatAmount, formatTravelDate } from "../lib/maps";

export function MonthlyMap({
  entries,
  onRemove,
  onAdd,
  canAdd,
  ready,
  removing,
}: {
  entries: KmsEntry[];
  onRemove: (journeyId: string) => void;
  onAdd: () => void;
  canAdd: boolean;
  ready: boolean;
  removing: boolean;
}) {
  function renderJourney(entry: KmsEntry) {
    function handleRemoveJourney() {
      onRemove(entry.id);
    }

    return (
      <tr key={entry.id} className="hover:bg-muted/30">
        <td className="whitespace-nowrap px-5 py-4 text-muted-foreground tabular-nums">
          <time dateTime={entry.date}>{formatTravelDate(entry.date)}</time>
        </td>
        <th scope="row" className="max-w-sm px-5 py-4 font-medium break-words">
          {entry.origin} → {entry.destination}
        </th>
        <td className="max-w-xs px-5 py-4 break-words text-muted-foreground">{entry.reason}</td>
        <td className="px-5 py-4 text-right tabular-nums">{entry.distance}</td>
        <td className="px-5 py-4 text-right font-medium tabular-nums">
          {formatAmount(entry.amountCents)}
        </td>
        <td className="px-5 py-4 text-right">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRemoveJourney}
            disabled={removing}
            title="Remove this journey"
            aria-label={`Remove journey from ${entry.origin} to ${entry.destination} on ${entry.date}`}
          >
            <IconTrash className="size-4" />
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-labelledby="monthly-map-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4">
        <div>
          <h2 id="monthly-map-heading" className="text-sm font-semibold">
            Monthly journeys
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Outward and return journeys are listed separately.
          </p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
          {ready ? "Saved" : "Loading..."}
        </span>
      </div>
      {!ready ? (
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">
          Waiting for saved mileage maps…
        </p>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center px-6 py-16 text-center">
          <IconCalendar className="mb-4 size-8 text-primary" aria-hidden="true" />
          <h3 className="font-semibold">No journeys this month</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            {canAdd
              ? "Choose a saved path and travel dates. You can add the same path as many times as you travelled it."
              : "Create a path first, then add your trips for this month."}
          </p>
          {canAdd ? (
            <Button className="mt-5" variant="outline" onClick={onAdd}>
              <IconPlus data-icon="inline-start" />
              Add trip
            </Button>
          ) : null}
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Monthly mileage entries"
          tabIndex={0}
        >
          <table className="w-full min-w-[740px] text-left text-sm">
            <caption className="sr-only">Mileage journeys ordered by travel date</caption>
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-5 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Journey
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  Business purpose
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Km
                </th>
                <th scope="col" className="px-5 py-3 text-right font-medium">
                  Amount
                </th>
                <th scope="col" className="px-5 py-3">
                  <span className="sr-only">Remove journey</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">{entries.map(renderJourney)}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
