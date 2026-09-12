import { useId, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "@/features/kms/lib/dates";
import { formatAmount, formatTravelDate } from "@/features/kms/lib/maps";
import type { KmsJourney } from "@/features/kms/schemas/types";
import type { CreatePerDiem } from "../schemas/types";
import { createPerDiemSchema } from "../schemas/validators";
import {
  allowanceCents,
  allowanceDays,
  MANAGER_RATES,
  TYPE_LABELS,
  valuesFromJourney,
} from "../lib/allowances";
import { PerDiemField, territoryOptions } from "./per-diem-field";

export function AddPerDiemDialog({
  journeys,
  month,
  initialJourneyId,
  onAdd,
  onClose,
}: {
  journeys: KmsJourney[];
  month: string;
  initialJourneyId: string;
  onAdd: (values: CreatePerDiem) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const [sourceId, setSourceId] = useState(initialJourneyId);
  const [pending, setPending] = useState(false);
  const source = journeys.find((item) => item.id === sourceId);
  const items = journeys.map((item) => ({
    value: item.id,
    label: `${dayjs.utc(item.date).format("DD MMM")} · ${item.origin} → ${item.destination} · ${item.distance} km`,
  }));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!pending}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle>Add per diems from mileage</DialogTitle>
          <DialogDescription>
            Select a journey, confirm the days away, and review the allowance for each day.
          </DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor={`${id}-journey`}>Mileage journey</FieldLabel>
          <Select
            items={items}
            value={sourceId}
            disabled={pending}
            onValueChange={(next) => {
              if (next) setSourceId(next);
            }}
          >
            <SelectTrigger id={`${id}-journey`} className="w-full min-w-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
              {items.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {source ? (
          <CreateAllowanceForm
            key={source.id}
            source={source}
            month={month}
            onAdd={onAdd}
            onClose={onClose}
            onPendingChange={setPending}
          />
        ) : (
          <p role="alert" className="text-sm text-destructive">
            This mileage journey is no longer available. Close and refresh the month.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CreateAllowanceForm({
  source,
  month,
  onAdd,
  onClose,
  onPendingChange,
}: {
  source: KmsJourney;
  month: string;
  onAdd: (values: CreatePerDiem) => Promise<void>;
  onClose: () => void;
  onPendingChange: (value: boolean) => void;
}) {
  const id = useId();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: valuesFromJourney(source, month),
    validators: { onSubmit: createPerDiemSchema },
    onSubmit: async ({ value }) => {
      if (busy.current) return;
      busy.current = true;
      onPendingChange(true);
      setError(null);
      try {
        await onAdd(value);
        onClose();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not save per diems. Please try again.",
        );
      } finally {
        busy.current = false;
        onPendingChange(false);
      }
    },
  });
  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe
        selector={(state) => ({
          values: state.values,
          isSubmitting: state.isSubmitting,
          canSubmit: state.canSubmit,
        })}
      >
        {({ values, isSubmitting, canSubmit }) => {
          const multiDay = values.departureDate !== values.returnDate;
          const valid = createPerDiemSchema.safeParse(values);
          const days = valid.success ? allowanceDays(valid.data) : [];
          const threshold = multiDay ? 50 : 20;
          return (
            <>
              <fieldset disabled={isSubmitting} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="departureDate">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-departure`}
                        label="Departure date"
                        type="date"
                        readOnly
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                        help="Date of the selected mileage journey."
                      />
                    )}
                  </form.Field>
                  <form.Field name="returnDate">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-return`}
                        label="Return date"
                        type="date"
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                        help="Use the same date for a day trip."
                      />
                    )}
                  </form.Field>
                </div>
                <form.Field name="destination">
                  {(field) => (
                    <PerDiemField
                      id={`${id}-destination`}
                      label="Business destination"
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      errors={field.state.meta.errors}
                      help="For a return journey, enter the place where you worked."
                    />
                  )}
                </form.Field>
                <form.Field name="reason">
                  {(field) => (
                    <PerDiemField
                      id={`${id}-reason`}
                      label="Business purpose"
                      type="textarea"
                      value={field.state.value}
                      onChange={field.handleChange}
                      onBlur={field.handleBlur}
                      errors={field.state.meta.errors}
                    />
                  )}
                </form.Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <form.Field name="territory">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-territory`}
                        label="Travel location"
                        options={territoryOptions}
                        value={field.state.value}
                        onChange={(next) => {
                          if (next === "portugal" || next === "abroad") {
                            field.handleChange(next);
                            form.setFieldValue("dailyRate", MANAGER_RATES[next]);
                            form.setFieldValue("dailyPercentage", next === "abroad" ? "100" : "25");
                            form.setFieldValue("departurePercentage", "100");
                            form.setFieldValue("intermediatePercentage", "100");
                            form.setFieldValue(
                              "returnPercentage",
                              next === "abroad" ? "100" : "25",
                            );
                          }
                        }}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                      />
                    )}
                  </form.Field>
                  <form.Field name="dailyRate">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-rate`}
                        label="Full daily rate (€)"
                        type="rate"
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                        help="Manager reference rate. Adjust for the travel date if needed."
                      />
                    )}
                  </form.Field>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
                  Confirm percentages using travel times and any meals or hotel paid separately.
                  Review the starting percentages for your trip before saving.
                  {values.territory === "portugal"
                    ? " Daily trips normally require more than 20 km from the work locality; multi-day trips more than 50 km."
                    : " Abroad, a separately paid hotel normally leaves 70% of the daily rate. Supplied meals require further adjustments."}
                  {values.territory === "portugal" && source.distance <= threshold ? (
                    <p className="mt-2 font-medium text-foreground">
                      This journey records {source.distance} km. Review whether it meets the{" "}
                      {threshold} km distance condition before saving.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  {(multiDay
                    ? ([
                        "departurePercentage",
                        "intermediatePercentage",
                        "returnPercentage",
                      ] as const)
                    : (["dailyPercentage"] as const)
                  ).map((name) => (
                    <form.Field key={name} name={name}>
                      {(field) => (
                        <PerDiemField
                          id={`${id}-${name}`}
                          label={
                            {
                              dailyPercentage: "Daily allowance (%)",
                              departurePercentage: "Departure (%)",
                              intermediatePercentage: "Intermediate days (%)",
                              returnPercentage: "Return (%)",
                            }[name]
                          }
                          type="percentage"
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          errors={field.state.meta.errors}
                        />
                      )}
                    </form.Field>
                  ))}
                </div>
                {days.length ? (
                  <div className="overflow-hidden rounded-lg border" aria-live="polite">
                    <div className="flex justify-between gap-4 bg-muted/40 px-4 py-3 text-sm font-medium">
                      <span>
                        {days.length} allowance {days.length === 1 ? "day" : "days"}
                      </span>
                      <span>
                        {formatAmount(days.reduce((sum, day) => sum + allowanceCents(day), 0))}
                      </span>
                    </div>
                    <div
                      className="max-h-52 overflow-auto"
                      role="region"
                      aria-label="Allowance preview"
                      tabIndex={0}
                    >
                      <table className="w-full text-left text-xs">
                        <caption className="sr-only">
                          Review the allowance for each date before saving
                        </caption>
                        <thead className="sr-only">
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Percentage</th>
                            <th>Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {days.map((day) => (
                            <tr key={day.date}>
                              <td className="whitespace-nowrap px-4 py-2">
                                {formatTravelDate(day.date)}
                              </td>
                              <td className="px-2 py-2">{TYPE_LABELS[day.type]}</td>
                              <td className="px-2 py-2 text-right">{day.percentage}%</td>
                              <td className="px-4 py-2 text-right tabular-nums">
                                {formatAmount(allowanceCents(day))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {days.some((day) => !day.date.startsWith(month)) ? (
                      <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                        Dates in another month will appear in that month's map and PDF.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </fieldset>
              {error ? (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
              <div className="mt-5 flex justify-end gap-2 border-t pt-5">
                <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting || !canSubmit}>
                  {isSubmitting ? <Spinner /> : null}
                  {isSubmitting ? "Saving..." : "Save per diems"}
                </Button>
              </div>
            </>
          );
        }}
      </form.Subscribe>
    </form>
  );
}
