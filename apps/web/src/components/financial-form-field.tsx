import type { ComponentProps } from "react";
import { Field, FieldError, FieldLabel } from "./ui/field";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { DatePicker } from "./ui/date-picker";

export function FinancialFormField({
  id,
  name,
  label,
  type,
  value,
  onChange,
  onBlur,
  errors,
}: {
  id: string;
  name: string;
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  errors?: ComponentProps<typeof FieldError>["errors"];
}) {
  const invalid = Boolean(errors?.length);
  const props = {
    id,
    name,
    value,
    onBlur,
    "aria-invalid": invalid,
    "aria-describedby": `${id}-error`,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      onChange(event.target.value),
  };
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {type === "date" ? (
        <DatePicker id={id} value={value} invalid={invalid} onBlur={onBlur} onChange={onChange} />
      ) : name === "description" ? (
        <Textarea {...props} rows={3} maxLength={1000} />
      ) : (
        <Input
          {...props}
          type={type}
          autoComplete="off"
          {...(type === "number"
            ? {
                step: "0.01",
                inputMode: "decimal" as const,
                min: name === "value" ? "0.01" : undefined,
              }
            : { maxLength: 120 })}
        />
      )}
      <FieldError id={`${id}-error`} errors={errors} />
    </Field>
  );
}
