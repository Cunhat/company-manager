import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
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
import { Spinner } from "@/components/ui/spinner";
import { IconTrash } from "@tabler/icons-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import type { Expense } from "../schemas/types";
import { deleteExpenseMutation, getExpensesQuery } from "../server/functions";

export function DeleteExpenseDialog({
  expense,
  disabled,
  onClose,
  onOpenChange,
}: {
  expense: Expense;
  disabled: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useQueryClient();
  const remove = useMutation(deleteExpenseMutation);

  const busy = disabled || remove.isPending;

  async function handleDelete() {
    setError(null);
    try {
      await remove.mutateAsync({ id: expense.id });

      client.setQueryData(getExpensesQuery.queryKey, (expenses) =>
        expenses?.filter((item) => item.id !== expense.id),
      );
      void invalidateAccountData(client);

      toast.success("Expense deleted");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete expense. Please try again.",
      );
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (remove.isPending) return;
        setOpen(open);
        onOpenChange(open);
        setError(null);
      }}
    >
      <AlertDialogTrigger render={<Button type="button" variant="destructive" disabled={busy} />}>
        <IconTrash aria-hidden="true" /> Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
          <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
            Are you sure you want to delete "{expense.title}"? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep expense</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={busy}
            onClick={() => void handleDelete()}
          >
            {remove.isPending ? <Spinner /> : null}
            {remove.isPending ? "Deleting..." : "Delete expense"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
