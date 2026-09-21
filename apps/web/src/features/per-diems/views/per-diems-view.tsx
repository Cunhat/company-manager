import { PayrollLockNotice, usePayrollLock } from "@/features/salary/components/month-lock";
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IconChevronLeft, IconChevronRight, IconPlus } from "@tabler/icons-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "@/features/kms/lib/dates";
import { formatAmount, formatTravelDate } from "@/features/kms/lib/maps";

import { monthSchema } from "@/features/kms/schemas/validators";
import {
  allowanceCents,
  perDiemsForMonth,
  tripHasClaimedDays,
  tripMeetsPerDiemDistance,
} from "../lib/allowances";
import {
  createPerDiemsMutation,
  deletePerDiemMutation,
  getPerDiemsQuery,
  getPerDiemJourneysQuery,
  updatePerDiemMutation,
} from "../server/functions";
import type { CreatePerDiem, EditPerDiem, PerDiem } from "../schemas/types";
import { AddPerDiemDialog } from "../components/add-per-diem-dialog";
import { EditPerDiemSheet } from "../components/edit-per-diem-sheet";
import { ExportPerDiemDialog } from "../components/export-per-diem-dialog";
import { MonthlyPerDiemMap } from "../sections/monthly-map";
import { MileageJourneys } from "../sections/mileage-journeys";

const authedRoute = getRouteApi("/_authed");
export default function PerDiemsView() {
  const { session } = authedRoute.useRouteContext();
  return <PerDiemsWorkspace key={session.user.id} userId={session.user.id} />;
}

export function PerDiemsWorkspace({ userId }: { userId: string }) {
  const [month, setMonth] = useState(() => dayjs().format("YYYY-MM"));
  const [tab, setTab] = useState<string | number | null>("maps");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<PerDiem | null>(null);
  const [deleting, setDeleting] = useState<PerDiem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const client = useQueryClient();
  const payrollLock = usePayrollLock(userId, month);
  const travelLocked = payrollLock.closed || payrollLock.unavailable;
  const allowances = useQuery(getPerDiemsQuery(userId, month));
  const journeys = useQuery(getPerDiemJourneysQuery(userId, month));
  const create = useMutation(createPerDiemsMutation);
  const update = useMutation(updatePerDiemMutation);
  const remove = useMutation(deletePerDiemMutation);
  const entries = perDiemsForMonth(allowances.data ?? [], month);
  const ready = allowances.isSuccess;
  const sourceReady = ready && journeys.isSuccess;
  const busy = create.isPending || update.isPending || remove.isPending;
  const claimedDates = new Set(entries.map((entry) => entry.date));
  const availableJourneys = (journeys.data ?? []).filter(
    (item) => tripMeetsPerDiemDistance(item) && !tripHasClaimedDays(item, claimedDates),
  );
  const canAdd = sourceReady && availableJourneys.length > 0 && !busy && !travelLocked;

  function cacheSaved(saved: PerDiem[], removedId?: string) {
    // Invalidate every month for this user: trips and date edits can cross month boundaries.
    client.setQueriesData<PerDiem[]>({ queryKey: ["per-diems", userId] }, (previous) =>
      previous?.filter(
        (entry) => entry.id !== removedId && !saved.some((row) => row.id === entry.id),
      ),
    );
    for (const savedMonth of new Set(saved.map((entry) => entry.date.slice(0, 7)))) {
      client.setQueryData(getPerDiemsQuery(userId, savedMonth).queryKey, (previous) =>
        previous
          ? perDiemsForMonth(
              [...previous, ...saved.filter((entry) => entry.date.startsWith(savedMonth))],
              savedMonth,
            )
          : undefined,
      );
    }
    void client.invalidateQueries({ queryKey: ["per-diems", userId] });
    void client.invalidateQueries({ queryKey: ["salary-travel", userId] });
  }
  async function handleCreate(values: CreatePerDiem) {
    const saved = await create.mutateAsync(values);
    cacheSaved(saved);
    setTab("maps");
    toast.success(`${saved.length} per diem ${saved.length === 1 ? "entry" : "entries"} saved`);
  }
  async function handleUpdate(values: EditPerDiem) {
    if (!editing) return;
    const saved = await update.mutateAsync({ ...values, id: editing.id });
    cacheSaved([saved]);
    setMonth(saved.date.slice(0, 7));
    toast.success("Per diem updated");
  }
  async function handleDelete() {
    if (!deleting || remove.isPending) return;
    setDeleteError(null);
    try {
      const deleted = await remove.mutateAsync({ id: deleting.id });
      cacheSaved([], deleted.id);
      setDeleting(null);
      toast.success("Per diem removed");
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : "Could not remove this per diem.");
    }
  }
  function addPerDiems(id = availableJourneys[0]?.id) {
    if (id && canAdd && availableJourneys.some((journey) => journey.id === id)) setSourceId(id);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Per diems</h1>
        <Button disabled={!canAdd} onClick={() => addPerDiems()}>
          <IconPlus data-icon="inline-start" />
          Add per diems
        </Button>
      </div>
      <PayrollLockNotice userId={userId} month={month} />
      <Tabs value={tab} onValueChange={setTab} className="flex min-w-0 flex-col gap-6">
        <TabsList aria-label="Per diem sections">
          <TabsTrigger value="maps">Monthly maps</TabsTrigger>
          <TabsTrigger value="journeys">
            Mileage trips{" "}
            <span className="ml-1.5 text-xs tabular-nums">{journeys.data?.length ?? 0}</span>
          </TabsTrigger>
        </TabsList>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <label htmlFor="per-diems-month" className="mb-2 block text-sm font-medium">
              Travel month
            </label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous month"
                onClick={() => setMonth(dayjs(month).subtract(1, "month").format("YYYY-MM"))}
              >
                <IconChevronLeft />
              </Button>
              <Input
                id="per-diems-month"
                className="w-44"
                type="month"
                value={month}
                onChange={(event) => {
                  const result = monthSchema.safeParse(event.target.value);
                  if (result.success) setMonth(result.data);
                }}
              />
              <Button
                variant="outline"
                size="icon"
                aria-label="Next month"
                onClick={() => setMonth(dayjs(month).add(1, "month").format("YYYY-MM"))}
              >
                <IconChevronRight />
              </Button>
            </div>
          </div>
          <Button
            disabled={!ready || allowances.isFetching || busy || entries.length === 0}
            onClick={() => setExportOpen(true)}
          >
            Download PDF
          </Button>
        </div>
        <TabsContent value="maps" className="flex min-w-0 flex-col gap-5">
          <dl
            className="grid divide-y overflow-hidden rounded-xl border bg-card sm:grid-cols-3 sm:divide-x sm:divide-y-0"
            aria-live="polite"
          >
            {[
              { label: "Allowance days", value: ready ? entries.length : "—" },
              {
                label: "Mileage trips",
                value: journeys.isSuccess ? journeys.data.length : "—",
              },
              {
                label: "Total per diems",
                value: ready
                  ? formatAmount(entries.reduce((sum, entry) => sum + allowanceCents(entry), 0))
                  : "—",
              },
            ].map((stat) => (
              <div key={stat.label} className="px-5 py-5">
                <dt className="text-xs text-muted-foreground">{stat.label}</dt>
                <dd className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
          {allowances.isError ? (
            <LoadError
              message="Could not load per diems for this month."
              busy={allowances.isFetching}
              onRetry={() => void allowances.refetch()}
            />
          ) : (
            <MonthlyPerDiemMap
              entries={entries}
              ready={ready}
              canAdd={canAdd}
              busy={busy || travelLocked}
              onAdd={() => addPerDiems()}
              onEdit={setEditing}
              onRemove={(entry) => {
                setDeleteError(null);
                setDeleting(entry);
              }}
            />
          )}
          {journeys.isError ? (
            <LoadError
              message="Could not load mileage journeys. Saved per diems are still available."
              busy={journeys.isFetching}
              onRetry={() => void journeys.refetch()}
            />
          ) : null}
        </TabsContent>
        <TabsContent value="journeys" className="min-w-0">
          {journeys.isError || allowances.isError ? (
            <LoadError
              message="Could not load mileage journeys and their allowance status."
              busy={journeys.isFetching || allowances.isFetching}
              onRetry={() => {
                void journeys.refetch();
                void allowances.refetch();
              }}
            />
          ) : (
            <MileageJourneys
              journeys={journeys.data ?? []}
              claimedDates={claimedDates}
              ready={sourceReady}
              disabled={travelLocked}
              onUse={addPerDiems}
            />
          )}
        </TabsContent>
      </Tabs>
      {sourceId ? (
        <AddPerDiemDialog
          month={month}
          journeys={availableJourneys}
          initialJourneyId={sourceId}
          onAdd={handleCreate}
          onClose={() => setSourceId(null)}
        />
      ) : null}
      {editing ? (
        <EditPerDiemSheet
          key={editing.id}
          entry={editing}
          onSave={handleUpdate}
          onClose={() => setEditing(null)}
        />
      ) : null}
      {exportOpen ? (
        <ExportPerDiemDialog entries={entries} month={month} onClose={() => setExportOpen(false)} />
      ) : null}
      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setDeleting(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this per diem?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting ? `${formatTravelDate(deleting.date)} · ${deleting.destination}. ` : ""}
              Only this allowance will be removed. The mileage journey stays saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError ? (
            <p role="alert" className="text-sm text-destructive">
              {deleteError}
            </p>
          ) : null}
          <AlertDialogFooter>
            <Button variant="outline" disabled={remove.isPending} onClick={() => setDeleting(null)}>
              Keep per diem
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => void handleDelete()}
            >
              {remove.isPending ? <Spinner /> : null}
              {remove.isPending ? "Removing..." : "Remove per diem"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LoadError({
  message,
  busy,
  onRetry,
}: {
  message: string;
  busy: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 p-4 text-sm"
    >
      {message}
      <Button variant="outline" disabled={busy} onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
