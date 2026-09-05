import type { ComponentProps } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const invoiceFields = [
  { name: "name", label: "Name", type: "text" },
  { name: "description", label: "Description", type: "text" },
  { name: "value", label: "Amount (€)", type: "number" },
  { name: "date", label: "Date", type: "date" },
] as const;

export function InvoiceFormField({
  id,
  name,
  label,
  type,
  value,
  errors,
  onBlur,
  onChange,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  errors: ComponentProps<typeof FieldError>["errors"];
  onBlur: () => void;
  onChange: (value: string) => void;
}) {
  const invalid = Boolean(errors?.length);
  const props = {
    id,
    name,
    value,
    onBlur,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${id}-error` : undefined,
  };
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {name === "description" ? (
        <Textarea {...props} rows={4} />
      ) : type === "date" ? (
        <DatePicker id={id} value={value} invalid={invalid} onBlur={onBlur} onChange={onChange} />
      ) : (
        <Input
          {...props}
          type={type}
          autoComplete="off"
          {...(name === "value"
            ? { min: "0.01", step: "0.01", inputMode: "decimal" as const }
            : {})}
        />
      )}
      <FieldError id={`${id}-error`} errors={errors} />
    </Field>
  );
}
