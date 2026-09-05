import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconCalendar, IconPlus } from "@tabler/icons-react";
import { format } from "date-fns";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldTitle,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { createInvoiceMutation, getInvoicesQuery } from "../server/functions";
import {
  createInvoiceSchema,
  invoiceStatuses,
  type InvoiceStatus,
} from "../schemas/validators";

function getLocalDateInputValue() {
  return formatLocalDate(new Date());
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value: string) {
  if (!value) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return undefined;
  }

  return new Date(year, month - 1, day);
}

function InvoiceDatePicker({
  id,
  value,
  invalid,
  onBlur,
  onChange,
}: {
  id: string;
  value: string;
  invalid: boolean;
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDate = parseLocalDate(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            data-empty={!selectedDate}
            className="w-full justify-start font-normal data-[empty=true]:text-muted-foreground"
            aria-invalid={invalid || undefined}
            onBlur={onBlur}
          />
        }
      >
        <IconCalendar data-icon="inline-start" />
        {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date) {
              return;
            }
            onChange(formatLocalDate(date));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}

function isInvoiceStatus(value: string): value is InvoiceStatus {
  return invoiceStatuses.includes(value as InvoiceStatus);
}

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);

  const { mutateAsync } = useMutation(createInvoiceMutation);

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      value: "",
      date: getLocalDateInputValue(),
      status: "pending" as InvoiceStatus,
    },
    onSubmit: async ({ value }) => {
      try {
        await mutateAsync(value, {
          onSuccess: (_data, _variables, _result, context) => {
            context.client.invalidateQueries(getInvoicesQuery);
            toast.success("Invoice created");
            setOpen(false);
            resetDialog();
          },
        });
      } catch (error) {
        console.error(error);
        toast.error(
          error instanceof Error ? error.message : "Could not create invoice",
        );
      }
    },
    validators: {
      onSubmit: createInvoiceSchema,
    },
  });

  function resetDialog() {
    form.reset();
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (form.state.isSubmitting) {
          return;
        }
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDialog();
        }
      }}
    >
      <AlertDialogTrigger render={<Button />}>
        <IconPlus data-icon="inline-start" />
        New invoice
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto data-[size=default]:sm:max-w-lg">
        <form
          className="grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            form.handleSubmit();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>New invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Fill in the invoice details.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <FieldGroup className="gap-4">
            <form.Field name="name">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Name</FieldLabel>
                    <Input
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={invalid || undefined}
                      autoComplete="off"
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="description">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Description</FieldLabel>
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(event) =>
                        field.handleChange(event.target.value)
                      }
                      aria-invalid={invalid || undefined}
                      rows={3}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="value">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Amount</FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id={field.name}
                        name={field.name}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        aria-invalid={invalid || undefined}
                        className="[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <InputGroupAddon align="inline-end">
                        <InputGroupText>€</InputGroupText>
                      </InputGroupAddon>
                    </InputGroup>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="date">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>Date</FieldLabel>
                    <InvoiceDatePicker
                      id={field.name}
                      value={field.state.value}
                      invalid={invalid}
                      onBlur={field.handleBlur}
                      onChange={field.handleChange}
                    />
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="status">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldTitle id="invoice-status-label">Status</FieldTitle>
                    <ToggleGroup
                      value={[field.state.value]}
                      onValueChange={(status) => {
                        const next = status[0];
                        if (next && isInvoiceStatus(next)) {
                          field.handleChange(next);
                        }
                      }}
                      variant="outline"
                      spacing={2}
                      className="w-full"
                      aria-labelledby="invoice-status-label"
                      aria-invalid={invalid || undefined}
                    >
                      <ToggleGroupItem value="pending" className="flex-1">
                        Pending
                      </ToggleGroupItem>
                      <ToggleGroupItem value="paid" className="flex-1">
                        Paid
                      </ToggleGroupItem>
                      <ToggleGroupItem value="cancelled" className="flex-1">
                        Cancelled
                      </ToggleGroupItem>
                    </ToggleGroup>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field>

            {/* <form.Field name="pdf">
              {(field) => {
                const invalid = field.state.meta.errors.length > 0;
                const file = field.state.value;
                return (
                  <Field data-invalid={invalid || undefined}>
                    <FieldLabel htmlFor={field.name}>PDF</FieldLabel>
                    <Input
                      key={fileInputKey}
                      id={field.name}
                      name={field.name}
                      type="file"
                      accept="application/pdf"
                      onBlur={field.handleBlur}
                      onChange={(event) => field.handleChange(event.target.files?.[0] ?? null)}
                      aria-invalid={invalid || undefined}
                    />
                    <FieldDescription>
                      {file ? file.name : "Optional. PDF files only."}
                    </FieldDescription>
                    <FieldError errors={field.state.meta.errors} />
                  </Field>
                );
              }}
            </form.Field> */}
          </FieldGroup>

          <AlertDialogFooter>
            <form.Subscribe
              selector={(state) => ({
                canSubmit: state.canSubmit,
                isSubmitting: state.isSubmitting,
              })}
            >
              {({ canSubmit, isSubmitting }) => (
                <>
                  <AlertDialogCancel type="button" disabled={isSubmitting}>
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    type="submit"
                    disabled={!canSubmit || isSubmitting}
                  >
                    {isSubmitting ? <Spinner data-icon="inline-start" /> : null}
                    {isSubmitting ? "Creating..." : "Create invoice"}
                  </AlertDialogAction>
                </>
              )}
            </form.Subscribe>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
