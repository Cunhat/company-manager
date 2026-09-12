import { Button } from "@/components/ui/button";
import dayjs from "@/features/kms/lib/dates";
import { formatTravelDate } from "@/features/kms/lib/maps";
import type { KmsJourney } from "@/features/kms/schemas/types";

export function MileageJourneys({
  journeys,
  claimedDates,
  ready,
  onUse,
}: {
  journeys: KmsJourney[];
  claimedDates: Set<string>;
  ready: boolean;
  onUse: (id: string) => void;
}) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-labelledby="per-diem-journeys-heading"
    >
      <div className="border-b px-5 py-4">
        <h2 id="per-diem-journeys-heading" className="text-sm font-semibold">
          Mileage journeys
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Use an outward journey to add the whole trip. Days already covered cannot be added again.
        </p>
      </div>
      {!ready ? (
        <p className="px-6 py-16 text-center text-sm text-muted-foreground">
          Loading mileage journeys...
        </p>
      ) : journeys.length === 0 ? (
        <div className="px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">No mileage journeys for this month.</p>
          <Button className="mt-5" variant="outline" render={<a href="/kms" />}>
            Open mileage
          </Button>
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          role="region"
          aria-label="Mileage journeys available for per diems"
          tabIndex={0}
        >
          <table className="w-full min-w-[740px] text-left text-sm">
            <caption className="sr-only">Use mileage journeys to create per diems</caption>
            <thead className="border-b bg-muted/40 text-xs text-muted-foreground">
              <tr>
                {["Date", "Journey", "Business purpose", "Km", "Allowance"].map((label) => (
                  <th scope="col" key={label} className="px-5 py-3 font-medium">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {journeys.map((journey) => {
                const date = dayjs.utc(journey.date).format("YYYY-MM-DD");
                const claimed = claimedDates.has(date);
                return (
                  <tr key={journey.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatTravelDate(date)}
                    </td>
                    <th scope="row" className="max-w-sm px-5 py-4 font-medium break-words">
                      {journey.origin} → {journey.destination}
                    </th>
                    <td className="max-w-xs px-5 py-4 break-words text-muted-foreground">
                      {journey.reason}
                    </td>
                    <td className="px-5 py-4 tabular-nums">{journey.distance}</td>
                    <td className="px-5 py-4">
                      {claimed ? (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          Day already covered
                        </span>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => onUse(journey.id)}>
                          Use journey
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
