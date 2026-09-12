import { useId, useState, type SubmitEvent } from "react";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import dayjs from "@/features/kms/lib/dates";
import { defaultExportDetails } from "@/features/kms/lib/export-details";
import { exportPerDiemPdfSchema } from "../schemas/validators";
import type { PerDiem } from "../schemas/types";

const fields = [
  {
    name: "company",
    label: "Company",
    maxLength: 250,
    autoComplete: "organization",
  },
  {
    name: "employee",
    label: "Employee / manager",
    maxLength: 100,
    autoComplete: "name",
  },
] as const;

export function ExportPerDiemDialog({
  entries,
  month,
  onClose,
}: {
  entries: PerDiem[];
  month: string;
  onClose: () => void;
}) {
  const id = useId();
  const [error, setError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      company: "TIAGO MARQUES CUNHA Unipessoal Lda",
      employee: defaultExportDetails.employee,
    },
    validators: {
      onChange: exportPerDiemPdfSchema,
      onSubmit: exportPerDiemPdfSchema,
    },
    onSubmit: async ({ value }) => {
      setError(null);

      try {
        const { downloadPerDiemPdf } = await import("../lib/monthly-pdf");
        const { company, ...details } = value;
        await downloadPerDiemPdf(entries, month, company, details);

        toast.success("Per diem report downloaded");
        onClose();
      } catch {
        setError("Could not generate the PDF. Please try again.");
      }
    },
  });

  function handleClose() {
    if (!form.state.isSubmitting) onClose();
  }

  function handleOpenChange(open: boolean) {
    if (!open) handleClose();
  }

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (form.state.isSubmitting) return;
    void form.handleSubmit();
  }

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        lang="en"
        showCloseButton={false}
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Export per diem report</DialogTitle>
          <DialogDescription>
            A Portuguese allowance map with the selected month’s entries, total, and signature line.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-5" noValidate onSubmit={handleSubmit}>
          <form.Subscribe
            selector={(state) => ({
              canSubmit: state.canSubmit,
              isSubmitting: state.isSubmitting,
            })}
          >
            {({ canSubmit, isSubmitting }) => (
              <>
                <fieldset disabled={isSubmitting} className="space-y-5">
                  {fields.map((definition) => (
                    <form.Field key={definition.name} name={definition.name}>
                      {(field) => {
                        const fieldId = `${id}-${definition.name}`;
                        const invalid = field.state.meta.errors.length > 0;
                        return (
                          <Field data-invalid={invalid || undefined}>
                            <FieldLabel htmlFor={fieldId}>{definition.label}</FieldLabel>
                            <Input
                              id={fieldId}
                              name={field.name}
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(event) => field.handleChange(event.target.value)}
                              required
                              maxLength={definition.maxLength}
                              autoComplete={definition.autoComplete}
                              aria-invalid={invalid || undefined}
                              aria-describedby={invalid ? `${fieldId}-error` : undefined}
                            />
                            <FieldError id={`${fieldId}-error`} errors={field.state.meta.errors} />
                          </Field>
                        );
                      }}
                    </form.Field>
                  ))}
                  <Field>
                    <FieldLabel htmlFor={`${id}-date`}>Date</FieldLabel>
                    <Input
                      id={`${id}-date`}
                      value={dayjs.utc(month).endOf("month").format("DD/MM/YYYY")}
                      readOnly
                      aria-describedby={`${id}-date-help`}
                    />
                    <p id={`${id}-date-help`} className="text-xs text-muted-foreground">
                      Last day of the selected month.
                    </p>
                  </Field>
                </fieldset>
                {error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : null}
                <div className="flex justify-end gap-2 border-t pt-5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting || !canSubmit}>
                    {isSubmitting ? <Spinner /> : null}
                    {isSubmitting ? "Generating PDF..." : "Download PDF"}
                  </Button>
                </div>
              </>
            )}
          </form.Subscribe>
        </form>
      </DialogContent>
    </Dialog>
  );
}
