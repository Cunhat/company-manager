import { useId, useRef, useState, type ReactNode } from "react";
import { useForm } from "@tanstack/react-form";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createAccountSchema } from "../schemas/validators";
import { FinancialFormField } from "@/components/financial-form-field";

const accountFields = [
  { name: "name", label: "Name", type: "text" },
  { name: "description", label: "Description", type: "text" },
  { name: "openingBalance", label: "Opening balance (€)", type: "number" },
] as const;

export type AccountFormValues = z.infer<typeof createAccountSchema>;

export function AccountForm({
  defaultValues,
  mode,
  onSubmit,
  onCancel,
  onSubmittingChange,
  disabled = false,
  secondaryAction,
}: {
  defaultValues: AccountFormValues;
  mode: "create" | "edit";
  onSubmit: (values: AccountFormValues) => Promise<void>;
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
    validators: { onSubmit: createAccountSchema },
    onSubmit: async ({ value }) => {
      if (submitting.current || disabled) return;
      submitting.current = true;
      onSubmittingChange(true);
      setError(null);

      try {
        await onSubmit(value);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "Could not save account. Please try again.",
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
            {accountFields.map((definition) => (
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
            <p className="text-xs text-muted-foreground">
              Use the balance before the activity recorded in this app. Historical invoices and
              expenses you assign will be added on top.
            </p>
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
            const changed = (Object.keys(defaultValues) as (keyof AccountFormValues)[]).some(
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
                      : "Create account"
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
