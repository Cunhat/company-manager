import { useId, useState, type ChangeEvent, type SubmitEvent } from "react";
import dayjs, { isTravelDate } from "../lib/dates";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  formatAmount,
  nightsBetween,
  RATE_CENTS_PER_KM,
  returnAfterNights,
} from "../lib/maps";
import type { KmsPath, CreateKmsTrip } from "../schemas/types";
import { tripDatesSchema } from "../schemas/validators";
import { Spinner } from "@/components/ui/spinner";

export function AddTripDialog({
  paths,
  month,
  initialPathId,
  onAdd,
  onClose,
}: {
  paths: KmsPath[];
  month: string;
  initialPathId: string;
  onAdd: (trip: CreateKmsTrip) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const today = dayjs().format("YYYY-MM-DD");
  const [pathId, setPathId] = useState(initialPathId);
  const [departureDate, setDepartureDate] = useState(
    dayjs(today).isSame(dayjs(month), "month") ? today : `${month}-01`,
  );
  const [returnDate, setReturnDate] = useState(departureDate);
  const [error, setError] = useState<string | null>(null);
  const path = paths.find((item) => item.id === pathId);
  const pathItems = [
    { label: "Select a path", value: null },
    ...paths.map((item) => ({
      label: `${item.origin} → ${item.destination} · ${item.distance} km · ${item.reason}`,
      value: item.id,
    })),
  ];
  const selectablePaths = pathItems.filter(
    (item): item is { label: string; value: string } => item.value !== null,
  );
  const datesValid = tripDatesSchema.safeParse({
    departureDate,
    returnDate,
  }).success;
  const nights = datesValid ? nightsBetween(departureDate, returnDate) : 0;

  function handleOpenChange(open: boolean) {
    if (!open && !pending) onClose();
  }

  function handlePathChange(value: string | null) {
    setPathId(value ?? "");
  }

  function handleDepartureChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.value;
    setDepartureDate(next);
    if (isTravelDate(next)) setReturnDate(returnAfterNights(next, nights));
  }

  function handleReturnChange(event: ChangeEvent<HTMLInputElement>) {
    setReturnDate(event.target.value);
  }

  function handleNightsChange(event: ChangeEvent<HTMLInputElement>) {
    const next = event.target.valueAsNumber;
    if (Number.isInteger(next) && next >= 0 && next <= 3650) {
      setReturnDate(returnAfterNights(departureDate, next));
    }
  }

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError(null);
    if (!path) {
      setError("Choose a saved path");
      return;
    }
    const dates = tripDatesSchema.safeParse({
      departureDate,
      returnDate,
    });
    if (!dates.success) {
      setError(dates.error.issues[0].message);
      return;
    }
    setPending(true);
    try {
      await onAdd({ pathId: path.id, ...dates.data });
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not save the trip. Please try again.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>Add a trip</DialogTitle>
          <DialogDescription>
            Select a saved path and when you travelled. Your return journey is
            included automatically.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" onSubmit={handleSubmit}>
          <fieldset disabled={pending} className="space-y-5">
            <Field>
              <FieldLabel htmlFor={`${id}-path`}>Path</FieldLabel>
              <Select
                items={pathItems}
                value={pathId || null}
                required
                onValueChange={handlePathChange}
              >
                <SelectTrigger id={`${id}-path`} className="w-full min-w-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectGroup>
                    {selectablePaths.map(renderPathItem)}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor={`${id}-departure`}>
                  Departure date
                </FieldLabel>
                <Input
                  id={`${id}-departure`}
                  type="date"
                  required
                  value={departureDate}
                  onChange={handleDepartureChange}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor={`${id}-return`}>Return date</FieldLabel>
                <Input
                  id={`${id}-return`}
                  type="date"
                  required
                  min={departureDate}
                  value={returnDate}
                  onChange={handleReturnChange}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor={`${id}-nights`}>Nights away</FieldLabel>
              <Input
                id={`${id}-nights`}
                type="number"
                min={0}
                max={3650}
                step={1}
                value={nights}
                disabled={!datesValid}
                onChange={handleNightsChange}
              />
              <p className="text-xs text-muted-foreground">
                0 means you returned on the same day. Staying longer does not
                add kilometres.
              </p>
            </Field>
            {path ? (
              <div
                className="rounded-xl border bg-muted/30 p-4 text-sm"
                aria-live="polite"
              >
                <p className="font-medium break-words">
                  {path.origin} → {path.destination} → {path.origin}
                </p>
                <div className="mt-2 flex justify-between gap-3 tabular-nums">
                  <span className="text-muted-foreground">
                    {path.distance} km × 2 journeys
                  </span>
                  <span className="font-semibold">
                    {formatAmount(path.distance * 2 * RATE_CENTS_PER_KM)}
                  </span>
                </div>
                {datesValid &&
                !dayjs(departureDate).isSame(dayjs(returnDate), "month") ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    Each journey will appear in its own travel month.
                  </p>
                ) : null}
              </div>
            ) : null}
            {error ? (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </fieldset>
          <div className="flex justify-end gap-2 border-t pt-5">
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!path || pending}>
              {pending ? <Spinner /> : null}
              {pending ? "Saving..." : "Add trip"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function renderPathItem(item: { label: string; value: string }) {
  return (
    <SelectItem key={item.value} value={item.value}>
      {item.label}
    </SelectItem>
  );
}
