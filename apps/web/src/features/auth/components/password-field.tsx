import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { useState } from "react";

export function PasswordField({
  id,
  name,
  value,
  onBlur,
  onChange,
  invalid,
  errors,
  autoComplete,
}: {
  id: string;
  name: string;
  value: string;
  onBlur: () => void;
  onChange: (value: string) => void;
  invalid: boolean;
  errors?: Array<{ message?: string } | undefined>;
  autoComplete: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <Field data-invalid={invalid || undefined}>
      <FieldLabel htmlFor={id}>Password</FieldLabel>
      <InputGroup className="h-11">
        <InputGroupInput
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          value={value}
          onBlur={onBlur}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid || undefined}
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-sm"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((current) => !current)}
          >
            {visible ? <IconEyeOff /> : <IconEye />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <FieldError errors={errors} />
    </Field>
  );
}
