import { useId, useRef, useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { formatAmount } from "@/features/kms/lib/maps";
import { allowanceCents, editValues, TYPE_LABELS } from "../lib/allowances";
import { editPerDiemSchema } from "../schemas/validators";
import type { EditPerDiem, PerDiem } from "../schemas/types";
import { PerDiemField, territoryOptions } from "./per-diem-field";

const typeOptions = Object.entries(TYPE_LABELS).map(([value, label]) => ({ value, label }));

export function EditPerDiemSheet({
  entry,
  onSave,
  onClose,
}: {
  entry: PerDiem;
  onSave: (values: EditPerDiem) => Promise<void>;
  onClose: () => void;
}) {
  const id = useId();
  const busy = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm({
    defaultValues: editValues(entry),
    validators: { onSubmit: editPerDiemSchema },
    onSubmit: async ({ value }) => {
      if (busy.current) return;
      busy.current = true;
      setError(null);
      try {
        await onSave(value);
        onClose();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save this per diem.");
      } finally {
        busy.current = false;
      }
    },
  });
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !busy.current) onClose();
      }}
    >
      <SheetContent
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        showCloseButton={false}
      >
        <SheetHeader className="border-b">
          <SheetTitle>Edit per diem</SheetTitle>
          <SheetDescription>
            Update this day's allowance. Other days in the trip keep their saved values.
          </SheetDescription>
        </SheetHeader>
        <form
          className="flex min-h-0 flex-1 flex-col"
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
            {({ values, isSubmitting, canSubmit }) => (
              <>
                <fieldset
                  disabled={isSubmitting}
                  className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6"
                >
                  <form.Field name="date">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-date`}
                        label="Date"
                        type="date"
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                      />
                    )}
                  </form.Field>
                  <form.Field name="destination">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-destination`}
                        label="Destination"
                        value={field.state.value}
                        onChange={field.handleChange}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
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
                  <form.Field name="type">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-type`}
                        label="Day type"
                        options={typeOptions}
                        value={field.state.value}
                        onChange={(next) => {
                          const result = editPerDiemSchema.shape.type.safeParse(next);
                          if (result.success) field.handleChange(result.data);
                        }}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                      />
                    )}
                  </form.Field>
                  <form.Field name="territory">
                    {(field) => (
                      <PerDiemField
                        id={`${id}-territory`}
                        label="Travel location"
                        options={territoryOptions}
                        value={field.state.value}
                        onChange={(next) => {
                          if (next === "portugal" || next === "abroad") field.handleChange(next);
                        }}
                        onBlur={field.handleBlur}
                        errors={field.state.meta.errors}
                        help="Changing location keeps your saved rate. Update the rate below if needed."
                      />
                    )}
                  </form.Field>
                  <div className="grid grid-cols-2 gap-4">
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
                        />
                      )}
                    </form.Field>
                    <form.Field name="percentage">
                      {(field) => (
                        <PerDiemField
                          id={`${id}-percentage`}
                          label="Allowance (%)"
                          type="percentage"
                          value={field.state.value}
                          onChange={field.handleChange}
                          onBlur={field.handleBlur}
                          errors={field.state.meta.errors}
                        />
                      )}
                    </form.Field>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Use the percentage after adjusting for travel times, supplied meals, and
                    accommodation.
                  </p>
                  <div
                    className="flex justify-between rounded-lg bg-muted/40 p-4 text-sm"
                    aria-live="polite"
                  >
                    <span>Allowance</span>
                    <span className="font-semibold tabular-nums">
                      {editPerDiemSchema.safeParse(values).success
                        ? formatAmount(
                            allowanceCents({
                              dailyRateCents: Math.round(Number(values.dailyRate) * 100),
                              percentage: Number(values.percentage),
                            }),
                          )
                        : "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mileage reference: {entry.sourceOrigin} · {entry.sourceDistance} km.
                    {entry.sourceJourneyId === null
                      ? " The source journey has been removed; this allowance is still saved."
                      : ""}
                  </p>
                  {error ? (
                    <p role="alert" className="text-sm text-destructive">
                      {error}
                    </p>
                  ) : null}
                </fieldset>
                <div className="flex justify-end gap-2 border-t bg-muted/20 p-6">
                  <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !canSubmit}>
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Saving..." : "Save changes"}
                  </Button>
                </div>
              </>
            )}
          </form.Subscribe>
        </form>
      </SheetContent>
    </Sheet>
  );
}
