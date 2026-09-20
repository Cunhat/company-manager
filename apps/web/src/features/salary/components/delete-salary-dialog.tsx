import { useState } from "react";
import { IconTrashFilled } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { KIND_LABELS, monthLabel } from "../lib/calculations";
import type { PayrollKind } from "../schemas/validators";

export function DeleteSalaryDialog({
  month,
  kind,
  disabled,
  onDelete,
  onOpenChange,
}: {
  month: string;
  kind: PayrollKind;
  disabled: boolean;
  onDelete: () => Promise<void>;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const changeOpen = (next: boolean) => {
    if (deleting) return;
    setOpen(next);
    setError(null);
    onOpenChange(next);
  };
  return (
    <AlertDialog open={open} onOpenChange={changeOpen}>
      <AlertDialogTrigger
        render={<Button type="button" variant="destructive" disabled={disabled || deleting} />}
      >
        <IconTrashFilled aria-hidden="true" />
        Delete salary
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this salary?</AlertDialogTitle>
          <AlertDialogDescription>
            {KIND_LABELS[kind]} for {monthLabel(month)} and its linked payment records, salary
            expense and tax transactions will be permanently deleted.
            {kind === "monthly"
              ? " The month will reopen for per diems and mileage. Existing travel entries will be kept."
              : " You can generate this bonus again for the same year."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => changeOpen(false)}
          >
            Keep salary
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={disabled || deleting}
            onClick={async () => {
              if (disabled || deleting) return;
              setDeleting(true);
              setError(null);
              try {
                await onDelete();
              } catch (cause) {
                setError(
                  cause instanceof Error
                    ? cause.message
                    : "Could not delete salary. Please try again.",
                );
              } finally {
                setDeleting(false);
              }
            }}
          >
            {deleting ? "Deleting..." : "Delete salary permanently"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
