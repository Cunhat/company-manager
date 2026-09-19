import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import {
  AlertDialog,
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
import type { Account } from "../schemas/types";
import { deleteAccountMutation } from "../server/functions";

export function DeleteAccountDialog({
  account,
  disabled,
  onClose,
  onOpenChange,
}: {
  account: Account;
  disabled: boolean;
  onClose: () => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const client = useQueryClient();
  const remove = useMutation(deleteAccountMutation);

  const busy = disabled || remove.isPending;

  async function handleDelete() {
    setError(null);
    try {
      await remove.mutateAsync({ id: account.id });

      void invalidateAccountData(client);

      toast.success("Account deleted");
      onClose();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not delete account. Please try again.",
      );
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(open) => {
        if (busy) return;
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
          <AlertDialogTitle>Delete this account?</AlertDialogTitle>
          <AlertDialogDescription className="break-words [overflow-wrap:anywhere]">
            Deleting "{account.name}" permanently deletes all its manual transactions. Invoices and
            expenses stay in your history with no account assigned. This cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Keep account</AlertDialogCancel>
          <Button variant="destructive" disabled={busy} onClick={() => void handleDelete()}>
            {remove.isPending ? <Spinner /> : null}
            {remove.isPending ? "Deleting..." : "Delete account"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
