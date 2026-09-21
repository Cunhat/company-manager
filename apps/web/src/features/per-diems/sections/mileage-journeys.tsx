import { Button } from "@/components/ui/button";
import dayjs from "@/features/kms/lib/dates";
import { formatTravelDate } from "@/features/kms/lib/maps";
import {
  PER_DIEM_DISTANCE_MESSAGE,
  tripHasClaimedDays,
  tripMeetsPerDiemDistance,
  type PerDiemJourney,
} from "../lib/allowances";

export function MileageJourneys({
  journeys,
  claimedDates,
  ready,
  disabled = false,
  onUse,
}: {
  journeys: PerDiemJourney[];
  claimedDates: Set<string>;
  ready: boolean;
  disabled?: boolean;
  onUse: (id: string) => void;
}) {
  return (
    <section
      className="min-w-0 overflow-hidden rounded-xl border bg-card"
      aria-labelledby="per-diem-journeys-heading"
    >
      <div className="border-b px-5 py-4">
        <h2 id="per-diem-journeys-heading" className="text-sm font-semibold">
          Mileage trips
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Outward and return journeys are grouped into one trip, including every overnight day.{" "}
          {PER_DIEM_DISTANCE_MESSAGE}
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
          aria-label="Mileage trips available for per diems"
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
                const claimed = tripHasClaimedDays(journey, claimedDates);
                return (
                  <tr key={journey.id} className="hover:bg-muted/30">
                    <td className="whitespace-nowrap px-5 py-4 text-muted-foreground">
                      {formatTravelDate(date)}
                      {journey.returnJourney &&
                      !dayjs.utc(journey.returnJourney.date).isSame(journey.date, "day") ? (
                        <span className="block text-xs">
                          to{" "}
                          {formatTravelDate(
                            dayjs.utc(journey.returnJourney.date).format("YYYY-MM-DD"),
                          )}
                        </span>
                      ) : null}
                    </td>
                    <th scope="row" className="max-w-sm px-5 py-4 font-medium break-words">
                      {journey.origin} → {journey.destination}
                      {journey.returnJourney ? (
                        <span className="mt-1 block text-xs font-normal text-muted-foreground">
                          {journey.returnJourney.origin} → {journey.returnJourney.destination} ·
                          Regresso
                        </span>
                      ) : null}
                    </th>
                    <td className="max-w-xs px-5 py-4 break-words text-muted-foreground">
                      {journey.reason}
                    </td>
                    <td className="px-5 py-4 tabular-nums">
                      {journey.distance + (journey.returnJourney?.distance ?? 0)}
                    </td>
                    <td className="px-5 py-4">
                      {!tripMeetsPerDiemDistance(journey) ? (
                        <span className="text-xs text-muted-foreground">
                          Not eligible: journey must exceed 20 km
                        </span>
                      ) : claimed ? (
                        <span className="whitespace-nowrap text-xs text-muted-foreground">
                          Trip has covered days
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={disabled}
                          onClick={() => onUse(journey.id)}
                        >
                          Use trip
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
