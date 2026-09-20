import { PayrollLockNotice, usePayrollLock } from "@/features/salary/components/month-lock";
import { useState, type ChangeEvent } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { getRouteApi } from "@tanstack/react-router";
import dayjs from "../lib/dates";
import type { CreateKmsTrip, KmsJourney } from "../schemas/types";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatePathDialog } from "../components/create-path-dialog";
import { AddTripDialog } from "../components/add-trip-dialog";
import { ExportMapDialog } from "../components/export-map-dialog";
import { entriesForMonth, formatAmount } from "../lib/maps";
import {
  createKmsTripMutation,
  deleteKmsJourneyMutation,
  getKmsJourneysQuery,
  getKmsPathsQuery,
} from "../server/functions";
import { monthSchema } from "../schemas/validators";
import { MonthlyMap } from "../sections/monthly-map";
import { PathsList } from "../sections/paths-list";

const authedRoute = getRouteApi("/_authed");

export default function KmsView() {
  const { session } = authedRoute.useRouteContext();
  return <KmsWorkspace key={session.user.id} userId={session.user.id} />;
}

export function KmsWorkspace({ userId }: { userId: string }) {
  const [tab, setTab] = useState<string | number | null>("maps");
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [tripPathId, setTripPathId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  const client = useQueryClient();

  const payrollLock = usePayrollLock(userId, month);
  const travelLocked = payrollLock.closed || payrollLock.unavailable;
  const journeys = useQuery(getKmsJourneysQuery(userId, month));

  const createTrip = useMutation(createKmsTripMutation);
  const deleteJourney = useMutation(deleteKmsJourneyMutation);

  const ready = journeys.isSuccess;

  const { data: paths, isError, isFetching, refetch } = useSuspenseQuery(getKmsPathsQuery(userId));

  const entries = entriesForMonth(journeys.data ?? [], month);
  const totalKm = entries.reduce((sum, entry) => sum + entry.distance, 0);
  const totalCents = entries.reduce((sum, entry) => sum + entry.amountCents, 0);
  const canAdd = paths.length > 0 && !travelLocked;

  function addTrip(pathId = paths[0]?.id ?? "") {
    if (travelLocked) return;
    setTab("maps");
    setTripPathId(pathId);
  }

  function handleAddTrip() {
    addTrip();
  }

  function handleCloseTrip() {
    setTripPathId(null);
  }

  function handleRefreshPaths() {
    void refetch();
  }

  function handleRefreshJourneys() {
    void journeys.refetch();
  }

  function handlePreviousMonth() {
    setMonth(dayjs(month).subtract(1, "month").format("YYYY-MM"));
  }

  function handleNextMonth() {
    setMonth(dayjs(month).add(1, "month").format("YYYY-MM"));
  }

  function handleMonthChange(event: ChangeEvent<HTMLInputElement>) {
    const result = monthSchema.safeParse(event.target.value);
    if (result.success) setMonth(result.data);
  }

  function handleJourneyDeleted(deleted: KmsJourney) {
    const query = getKmsJourneysQuery(userId, dayjs.utc(deleted.date).format("YYYY-MM"));
    client.setQueryData(query.queryKey, (previous) =>
      previous?.filter((item) => item.id !== deleted.id),
    );
    void client.invalidateQueries({ queryKey: ["kms-journeys", userId] });
    void client.invalidateQueries({ queryKey: ["salary-travel", userId] });
    toast.success("Journey removed");
  }

  function handleDeleteError(cause: Error) {
    toast.error(cause.message || "Could not remove journey. Please try again.");
  }

  function handleRemoveJourney(id: string) {
    deleteJourney.mutate(
      { id },
      {
        onSuccess: handleJourneyDeleted,
        onError: handleDeleteError,
      },
    );
  }

  async function handleCreateTrip(trip: CreateKmsTrip) {
    const created = await createTrip.mutateAsync(trip);
    const months = new Set(created.map((item) => dayjs.utc(item.date).format("YYYY-MM")));
    for (const affectedMonth of months) {
      const query = getKmsJourneysQuery(userId, affectedMonth);
      client.setQueryData(query.queryKey, (previous) =>
        previous
          ? [
              ...previous,
              ...created.filter(
                (item) =>
                  dayjs.utc(item.date).format("YYYY-MM") === affectedMonth &&
                  !previous.some((saved) => saved.id === item.id),
              ),
            ]
          : undefined,
      );
      void client.invalidateQueries({ queryKey: ["kms-journeys", userId] });
    }
    setMonth(dayjs(trip.departureDate).format("YYYY-MM"));
    void client.invalidateQueries({ queryKey: ["salary-travel", userId] });
    toast.success("Trip added", {
      description: "Outward and return journeys saved.",
    });
  }

  function handleDownloadMap() {
    setExportOpen(true);
  }

  function handleCloseExport() {
    setExportOpen(false);
  }

  if (isError) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"
      >
        Could not refresh saved paths.
        <Button variant="outline" disabled={isFetching} onClick={handleRefreshPaths}>
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Mileage</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <CreatePathDialog userId={userId} />
          <Button disabled={!canAdd} onClick={handleAddTrip}>
            <IconPlus data-icon="inline-start" />
            Add trip
          </Button>
        </div>
      </div>
      <PayrollLockNotice userId={userId} month={month} />
      <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-6">
        <TabsList aria-label="Mileage sections">
          <TabsTrigger value="maps">Monthly maps</TabsTrigger>
          <TabsTrigger value="paths">
            Paths <span className="ml-1.5 text-xs tabular-nums">{paths.length}</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="maps" className="flex min-w-0 flex-col gap-5">
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
                  onClick={handlePreviousMonth}
                >
                  <IconChevronLeft />
                </Button>
                <Input
                  id="kms-month"
                  className="w-44"
                  type="month"
                  value={month}
                  onChange={handleMonthChange}
                />
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Next month"
                  onClick={handleNextMonth}
                >
                  <IconChevronRight />
                </Button>
              </div>
            </div>
            <Button
              disabled={
                !ready ||
                journeys.isFetching ||
                createTrip.isPending ||
                deleteJourney.isPending ||
                entries.length === 0
              }
              onClick={handleDownloadMap}
            >
              Download PDF
            </Button>
          </div>
          <dl
            className="grid divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            aria-live="polite"
          >
            {[
              { label: "Journeys", value: ready ? entries.length : "—" },
              {
                label: "Total kilometres",
                value: ready ? `${totalKm.toLocaleString("en-GB")} km` : "—",
              },
              {
                label: "Reimbursement · €0.40/km",
                value: ready ? formatAmount(totalCents) : "—",
              },
            ].map(renderStat)}
          </dl>
          {journeys.isError ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"
            >
              Could not load journeys for this month.
              <Button
                variant="outline"
                disabled={journeys.isFetching}
                onClick={handleRefreshJourneys}
              >
                Try again
              </Button>
            </div>
          ) : (
            <MonthlyMap
              entries={entries}
              ready={ready}
              canAdd={canAdd}
              onAdd={handleAddTrip}
              removing={deleteJourney.isPending || travelLocked}
              onRemove={handleRemoveJourney}
            />
          )}
        </TabsContent>
        <TabsContent value="paths" className="min-w-0">
          <PathsList paths={paths} disabled={travelLocked} onUse={addTrip} />
        </TabsContent>
      </Tabs>
      {tripPathId !== null ? (
        <AddTripDialog
          paths={paths}
          month={month}
          initialPathId={tripPathId}
          onClose={handleCloseTrip}
          onAdd={handleCreateTrip}
        />
      ) : null}
      {exportOpen ? (
        <ExportMapDialog journeys={journeys.data ?? []} month={month} onClose={handleCloseExport} />
      ) : null}
    </div>
  );
}

function renderStat(stat: { label: string; value: string | number }) {
  return (
    <div key={stat.label} className="px-5 py-5">
      <dt className="text-xs text-muted-foreground">{stat.label}</dt>
      <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">{stat.value}</dd>
    </div>
  );
}
