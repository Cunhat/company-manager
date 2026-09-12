import type { ComponentProps } from "react";
import { DatePicker } from "@/components/ui/date-picker";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function PerDiemField({
  id,
  label,
  value,
  onChange,
  onBlur,
  errors,
  type = "text",
  options,
  help,
  readOnly = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  errors: ComponentProps<typeof FieldError>["errors"];
  type?: "text" | "date" | "rate" | "percentage" | "textarea";
  options?: { value: string; label: string }[];
  help?: string;
  readOnly?: boolean;
}) {
  const invalid = Boolean(errors?.length);
  const props = {
    id,
    value,
    onBlur,
    "aria-invalid": invalid || undefined,
    "aria-describedby": `${id}-help ${id}-error`,
  };
  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {options ? (
        <Select
          items={options}
          value={value}
          onValueChange={(next) => {
            if (next !== null) onChange(next);
          }}
        >
          <SelectTrigger
            id={id}
            className="w-full"
            onBlur={onBlur}
            aria-invalid={invalid || undefined}
            aria-describedby={`${id}-help ${id}-error`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : type === "date" && !readOnly ? (
        <DatePicker id={id} value={value} onBlur={onBlur} onChange={onChange} invalid={invalid} />
      ) : type === "textarea" ? (
        <Textarea
          {...props}
          maxLength={500}
          rows={3}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <Input
          {...props}
          readOnly={readOnly}
          autoComplete="off"
          type={
            type === "rate" || type === "percentage" ? "number" : type === "date" ? "date" : "text"
          }
          min={type === "rate" ? "0.01" : type === "percentage" ? "0" : undefined}
          max={type === "rate" ? "10000" : type === "percentage" ? "100" : undefined}
          step={type === "rate" ? "0.01" : type === "percentage" ? "1" : undefined}
          maxLength={250}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
      <p id={`${id}-help`} className={help ? "text-xs text-muted-foreground" : "sr-only"}>
        {help}
      </p>
      <FieldError id={`${id}-error`} errors={errors} />
    </Field>
  );
}

export const territoryOptions = [
  { value: "portugal", label: "Portugal" },
  { value: "abroad", label: "Abroad" },
];
