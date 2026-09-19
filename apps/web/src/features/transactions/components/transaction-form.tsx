import { AccountSelect } from "@/features/accounts/components/account-select";
import { useId, useRef, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createTransactionSchema } from "../schemas/validators";
import { FinancialFormField } from "@/components/financial-form-field";

const transactionFields = [
  { name: "description", label: "Description", type: "text" },
  { name: "value", label: "Amount (€)", type: "number" },
  { name: "date", label: "Date", type: "date" },
] as const;

export type TransactionFormValues = z.infer<typeof createTransactionSchema>;

export function TransactionForm({
  defaultValues,
  mode,
  onSubmit,
  onCancel,
  onSubmittingChange,
  disabled = false,
  secondaryAction,
}: {
  defaultValues: TransactionFormValues;
  mode: "create" | "edit";
  onSubmit: (values: TransactionFormValues) => Promise<void>;
  onCancel: () => void;
  onSubmittingChange: (submitting: boolean) => void;
  disabled?: boolean;
  secondaryAction?: ReactNode;
}) {
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const submitting = useRef(false);

  const form = useForm({
    defaultValues,
    validators: { onSubmit: createTransactionSchema },
    onSubmit: async ({ value }) => {
      if (submitting.current || disabled) return;
      submitting.current = true;
      onSubmittingChange(true);
      setError(null);

      try {
        await onSubmit(value);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not save transaction. Please try again.",
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
                  disabled={disabled || isSubmitting}
                />
              )}
            </form.Field>
            {transactionFields.map((definition) => (
              <form.Field key={definition.name} name={definition.name}>
                {(field) => (
                  <FinancialFormField
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
            <form.Field name="type">
              {(field) => (
                <Field>
                  <FieldLabel id={`${id}-type`}>Type</FieldLabel>
                  <ToggleGroup
                    value={[field.state.value]}
                    variant="outline"
                    spacing={2}
                    className="w-full"
                    aria-labelledby={`${id}-type`}
                    disabled={disabled || isSubmitting}
                    onValueChange={(values) => {
                      const next = values[0];
                      if (next === "income" || next === "expense") field.handleChange(next);
                    }}
                  >
                    <ToggleGroupItem value="income" className="flex-1">
                      Income
                    </ToggleGroupItem>
                    <ToggleGroupItem value="expense" className="flex-1">
                      Expense
                    </ToggleGroupItem>
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
            const changed = (Object.keys(defaultValues) as (keyof TransactionFormValues)[]).some(
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
                      : "Create transaction"
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
