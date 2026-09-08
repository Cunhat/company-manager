import { useId, useState } from "react";
import { format } from "date-fns";
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
import type { KmsPath, KmsTrip } from "../schemas/types";
import { tripDatesSchema } from "../schemas/validators";

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
  onAdd: (trip: KmsTrip) => boolean;
  onClose: () => void;
}) {
  const id = useId();
  const today = format(new Date(), "yyyy-MM-dd");
  const [pathId, setPathId] = useState(initialPathId);
  const [departureDate, setDepartureDate] = useState(
    today.startsWith(month) ? today : `${month}-01`,
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
  const datesValid = tripDatesSchema.safeParse({
    departureDate,
    returnDate,
  }).success;
  const nights = datesValid ? nightsBetween(departureDate, returnDate) : 0;

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a trip</DialogTitle>
          <DialogDescription>
            Select a saved path and when you travelled. Your return journey is
            included automatically.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
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
            if (
              onAdd({
                id: crypto.randomUUID(),
                pathId: path.id,
                origin: path.origin,
                destination: path.destination,
                reason: path.reason,
                distance: path.distance,
                ...dates.data,
              })
            )
              onClose();
            else
              setError(
                "Could not save the trip to browser storage. Please try again.",
              );
          }}
        >
          <Field>
            <FieldLabel htmlFor={`${id}-path`}>Path</FieldLabel>
            <Select
              items={pathItems}
              value={pathId || null}
              required
              onValueChange={(value) => setPathId(value ?? "")}
            >
              <SelectTrigger id={`${id}-path`} className="w-full min-w-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                <SelectGroup>
                  {pathItems
                    .filter(
                      (item): item is { label: string; value: string } =>
                        item.value != null,
                    )
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
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
                onChange={(event) => {
                  const next = event.target.value;
                  setDepartureDate(next);
                  if (
                    tripDatesSchema.safeParse({
                      departureDate: next,
                      returnDate: next,
                    }).success
                  ) {
                    setReturnDate(returnAfterNights(next, nights));
                  }
                }}
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
                onChange={(event) => setReturnDate(event.target.value)}
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
              onChange={(event) => {
                const next = event.target.valueAsNumber;
                if (Number.isInteger(next) && next >= 0 && next <= 3650)
                  setReturnDate(returnAfterNights(departureDate, next));
              }}
            />
            <p className="text-xs text-muted-foreground">
              0 means you returned on the same day. Staying longer does not add
              kilometres.
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
              departureDate.slice(0, 7) !== returnDate.slice(0, 7) ? (
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
          <div className="flex justify-end gap-2 border-t pt-5">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!path}>
              Add trip
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
