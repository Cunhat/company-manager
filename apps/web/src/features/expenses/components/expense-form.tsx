import { AccountSelect } from "@/features/accounts/components/account-select";
import { useId, useRef, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createExpenseSchema, editExpenseFormSchema } from "../schemas/validators";
import { ExpenseFormField, expenseFields } from "./expense-form-field";

export type ExpenseFormValues = z.infer<typeof createExpenseSchema>;

export function ExpenseForm({
  defaultValues,
  mode,
  onSubmit,
  onCancel,
  onSubmittingChange,
  disabled = false,
  secondaryAction,
}: {
  defaultValues: ExpenseFormValues;
  mode: "create" | "edit";
  onSubmit: (values: ExpenseFormValues) => Promise<void>;
  onCancel: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  disabled?: boolean;
  secondaryAction?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const submitting = useRef(false);

  const validationSchema: z.ZodType<ExpenseFormValues, ExpenseFormValues> =
    mode === "create" ? createExpenseSchema : editExpenseFormSchema;
  const form = useForm({
    defaultValues,
    validators: { onSubmit: validationSchema },
    onSubmit: async ({ value }) => {
      if (submitting.current || disabled) return;
      submitting.current = true;
      onSubmittingChange(true);
      setError(null);

      try {
        await onSubmit(value);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not save expense. Please try again.",
        );
      } finally {
        submitting.current = false;
        onSubmittingChange(false);
      }
    },
  });
  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Subscribe selector={(state) => state.isSubmitting}>
        {(isSubmitting) => (
          <fieldset
            disabled={disabled || isSubmitting}
            className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6"
          >
            <form.Field name="accountId">
              {(field) => (
                <AccountSelect
                  id={`${id}-account`}
                  value={field.state.value}
                  onChange={field.handleChange}
                  onBlur={field.handleBlur}
                  errors={field.state.meta.errors}
                  allowUnassigned={mode === "edit" && !defaultValues.accountId}
                  disabled={disabled || isSubmitting}
                />
              )}
            </form.Field>
            <p className="text-xs text-muted-foreground">
              The account balance decreases by the exact amount entered, including any IVA already
              paid.
            </p>
            {expenseFields.map((definition) => (
              <form.Field key={definition.name} name={definition.name}>
                {(field) => (
                  <ExpenseFormField
                    {...definition}
                    id={`${id}-${definition.name}`}
                    value={field.state.value}
                    errors={field.state.meta.errors}
                    onBlur={field.handleBlur}
                    onChange={field.handleChange}
                  />
                )}
              </form.Field>
            ))}
            <form.Field name="iva">
              {(field) => (
                <Field>
                  <FieldLabel id={`${id}-iva`}>IVA</FieldLabel>
                  <ToggleGroup
                    value={[field.state.value ? "yes" : "no"]}
                    onValueChange={(values) => {
                      const next = values[0];
                      if (next === "yes" || next === "no") field.handleChange(next === "yes");
                    }}
                    disabled={disabled || isSubmitting}
                    variant="outline"
                    spacing={2}
                    className="w-full"
                    aria-labelledby={`${id}-iva`}
                  >
                    {["no", "yes"].map((option) => (
                      <ToggleGroupItem key={option} value={option} className="flex-1 capitalize">
                        {option === "yes" ? "With IVA" : "Without IVA"}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                  <FieldError errors={field.state.meta.errors} />
                </Field>
              )}
            </form.Field>
            {error ? (
              <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
          </fieldset>
        )}
      </form.Subscribe>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/20 p-6">
        {secondaryAction}
        <form.Subscribe
          selector={(state) => ({
            values: state.values,
            canSubmit: state.canSubmit,
            isSubmitting: state.isSubmitting,
          })}
        >
          {({ values, canSubmit, isSubmitting }) => {
            const changed = (Object.keys(defaultValues) as (keyof ExpenseFormValues)[]).some(
              (key) => values[key] !== defaultValues[key],
            );
            return (
              <div className="ml-auto flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || isSubmitting}
                  onClick={onCancel}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={disabled || isSubmitting || !canSubmit || (mode === "edit" && !changed)}
                >
                  {isSubmitting ? <Spinner /> : null}
                  {mode === "create"
                    ? isSubmitting
                      ? "Creating..."
                      : "Create expense"
                    : isSubmitting
                      ? "Saving..."
                      : "Save changes"}
                </Button>
              </div>
            );
          }}
        </form.Subscribe>
      </div>
    </form>
  );
}
