import { useState } from "react";
import { Tabs } from "@base-ui/react/tabs";
import { useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import { addMonths, format, parseISO } from "date-fns";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePathDialog } from "../components/create-path-dialog";
import { AddTripDialog } from "../components/add-trip-dialog";
import { useLocalKms } from "../hooks/use-local-kms";
import { entriesForMonth, formatAmount, generateMonthlyMap, replaceTrips } from "../lib/maps";
import { getKmsPathsQuery } from "../server/functions";
import { monthSchema } from "../schemas/validators";
import { MonthlyMap } from "../sections/monthly-map";
import { PathsList } from "../sections/paths-list";

const authedRoute = getRouteApi("/_authed");

export default function KmsView() {
  const { session } = authedRoute.useRouteContext();
  return <KmsWorkspace key={session.user.id} userId={session.user.id} />;
}

export function KmsWorkspace({ userId }: { userId: string }) {
  const { data: paths, isError, isFetching, refetch } = useSuspenseQuery(getKmsPathsQuery(userId));
  const { state, ready, error, save } = useLocalKms(userId);
  const [tab, setTab] = useState<string | number | null>("maps");
  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [tripPathId, setTripPathId] = useState<string | null>(null);
  const entries = entriesForMonth(state.trips, month);
  const totalKm = entries.reduce((sum, entry) => sum + entry.distance, 0);
  const totalCents = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const canAdd = ready && paths.length > 0;

  function addTrip(pathId = paths[0]?.id ?? "") {
    setTab("maps");
    setTripPathId(pathId);
  }

  function generate() {
    const map = generateMonthlyMap(state.trips, month);
    if (!save({ ...state, maps: { ...state.maps, [month]: map } })) return;
    console.log("Monthly KMS map", {
      userId,
      ...map,
      totalReimbursement: map.totalAmountCents / 100,
    });
    toast.success("Monthly map generated and saved", {
      description: "The full result is available in the console.",
    });
  }

  const tabClass =
    "cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring data-active:bg-background data-active:text-foreground data-active:shadow-sm";

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mileage</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your business trips, reimbursed at €0.40 per kilometre.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreatePathDialog userId={userId} />
          <Button disabled={!canAdd} onClick={() => addTrip()}>
            <IconPlus data-icon="inline-start" />
            Add trip
          </Button>
        </div>
      </div>
      {isError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"
        >
          Could not refresh saved paths.
          <Button variant="outline" disabled={isFetching} onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </p>
      ) : null}
      <Tabs.Root value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-6">
        <Tabs.List
          aria-label="Mileage sections"
          className="flex w-fit gap-1 rounded-xl bg-muted p-1"
        >
          <Tabs.Tab value="maps" className={tabClass}>
            Monthly maps
          </Tabs.Tab>
          <Tabs.Tab value="paths" className={tabClass}>
            Paths <span className="ml-1.5 text-xs tabular-nums">{paths.length}</span>
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="maps" className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <label htmlFor="kms-month" className="mb-2 block text-sm font-medium">
                Travel month
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Previous month"
                  onClick={() =>
                    setMonth(format(addMonths(parseISO(`${month}-01`), -1), "yyyy-MM"))
                  }
                >
                  <IconChevronLeft />
                </Button>
                <Input
                  id="kms-month"
                  className="w-44"
                  type="month"
                  value={month}
                  onChange={(event) => {
                    if (monthSchema.safeParse(event.target.value).success)
                      setMonth(event.target.value);
                  }}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={() => setMonth(format(addMonths(parseISO(`${month}-01`), 1), "yyyy-MM"))}
                >
                  <IconChevronRight />
                </Button>
              </div>
            </div>
            <Button disabled={!ready || entries.length === 0} onClick={generate}>
              Generate map
            </Button>
          </div>
          <dl
            className="grid divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            aria-live="polite"
          >
            {[
              { label: "Journeys", value: entries.length },
              { label: "Total kilometres", value: `${totalKm.toLocaleString("en-GB")} km` },
              { label: "Reimbursement · €0.40/km", value: formatAmount(totalCents) },
            ].map((stat) => (
              <div key={stat.label} className="px-5 py-5">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          <MonthlyMap
            entries={entries}
            ready={ready}
            canAdd={canAdd}
            onAdd={() => addTrip()}
            generatedAt={state.maps[month]?.generatedAt}
            onRemove={(tripId) => {
              const trip = state.trips.find((item) => item.id === tripId);
              if (
                trip &&
                save(
                  replaceTrips(
                    state,
                    state.trips.filter((item) => item.id !== tripId),
                    trip,
                  ),
                )
              )
                toast.success("Outward and return journeys removed");
            }}
          />
        </Tabs.Panel>
        <Tabs.Panel value="paths" className="min-w-0">
          <PathsList paths={paths} disabled={!ready} onUse={addTrip} />
        </Tabs.Panel>
      </Tabs.Root>
      {tripPathId !== null ? (
        <AddTripDialog
          paths={paths}
          month={month}
          initialPathId={tripPathId}
          onClose={() => setTripPathId(null)}
          onAdd={(trip) => {
            if (!save(replaceTrips(state, [...state.trips, trip], trip))) return false;
            setMonth(trip.departureDate.slice(0, 7));
            toast.success("Trip added", { description: "Outward and return journeys saved." });
            return true;
          }}
        />
      ) : null}
    </div>
  );
}
