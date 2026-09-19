import { useId } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAccountsQuery } from "../server/functions";

export function AccountFilter({
  value,
  onChange,
  includeUnassigned = false,
}: {
  value: string;
  onChange: (value: string) => void;
  includeUnassigned?: boolean;
}) {
  const id = useId();
  const { data: accounts } = useQuery(getAccountsQuery);
  const items = [
    { value: "all", label: "All accounts" },
    ...(includeUnassigned ? [{ value: "unassigned", label: "Unassigned" }] : []),
    ...(accounts ?? []).map((account) => ({ value: account.id, label: account.name })),
  ];
  return (
    <div className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        Filter by account
      </label>
      <Select items={items} value={value} onValueChange={(next) => onChange(next ?? "all")}>
        <SelectTrigger id={id} className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>
              {item.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function matchesAccount(record: { accountId: string | null }, filter: string) {
  return (
    filter === "all" ||
    (filter === "unassigned" ? record.accountId === null : record.accountId === filter)
  );
}
