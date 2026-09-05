import { useState } from "react";
import { IconCalendar } from "@tabler/icons-react";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
    ? date
    : undefined;
}

export type DatePickerProps = {
  id: string;
  value: string;
  invalid?: boolean;
  onBlur?: () => void;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function DatePicker({
  id,
  value,
  invalid = false,
  onBlur,
  onChange,
  placeholder = "Pick a date",
}: DatePickerProps) {
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
        {selectedDate ? format(selectedDate, "PPP") : placeholder}
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
