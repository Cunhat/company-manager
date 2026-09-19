import type { ComponentProps } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccountsQuery } from "../server/functions";

export function AccountSelect({
  id,
  value,
  onChange,
  onBlur,
  errors,
  allowUnassigned = false,
  disabled = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  errors?: ComponentProps<typeof FieldError>["errors"];
  allowUnassigned?: boolean;
  disabled?: boolean;
}) {
  const { data: accounts, isPending, isError, refetch } = useQuery(getAccountsQuery);
  const items = [
    { value: "", label: allowUnassigned ? "Unassigned" : "Choose an account" },
    ...(accounts ?? []).map((account) => ({ value: account.id, label: account.name })),
  ];
  return (
    <Field>
      <FieldLabel htmlFor={id}>Account</FieldLabel>
      <Select
        items={items}
        value={value}
        onValueChange={(next) => onChange(next ?? "")}
        disabled={disabled || isPending || isError}
      >
        <SelectTrigger
          id={id}
          onBlur={onBlur}
          className="w-full"
          aria-invalid={Boolean(errors?.length)}
          aria-describedby={`${id}-help ${id}-error`}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem
              key={item.value}
              value={item.value}
              disabled={!item.value && !allowUnassigned}
            >
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div id={`${id}-help`} className="text-xs text-muted-foreground">
        {isPending ? (
          "Loading accounts…"
        ) : isError ? (
          <span role="alert">
            Could not load accounts.{" "}
            <Button type="button" variant="link" onClick={() => void refetch()}>
              Try again
            </Button>
          </span>
        ) : accounts?.length === 0 ? (
          <span>
            <Link to="/accounts" className="underline underline-offset-4">
              Create an account
            </Link>{" "}
            before assigning this record.
          </span>
        ) : allowUnassigned ? (
          "Unassigned records are excluded from account balances."
        ) : (
          "Required for new records."
        )}
      </div>
      <FieldError id={`${id}-error`} errors={errors} />
    </Field>
  );
}
