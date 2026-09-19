import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { Account } from "../schemas/types";
import { updateAccountMutation } from "../server/functions";
import { AccountForm, type AccountFormValues } from "./account-form";
import { DeleteAccountDialog } from "./delete-account-dialog";

export function EditAccountSheet({
  account,
  onClose,
  returnFocus,
}: {
  account: Account;
  onClose: () => void;
  returnFocus: HTMLElement | null;
}) {
  const client = useQueryClient();
  const update = useMutation(updateAccountMutation);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdate(values: AccountFormValues) {
    await update.mutateAsync({ ...values, id: account.id });
    void invalidateAccountData(client);
    toast.success("Account updated");
    onClose();
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open && !submitting && !confirmDelete) onClose();
      }}
    >
      <SheetContent
        className="data-[side=right]:w-full data-[side=right]:sm:max-w-lg"
        showCloseButton={!submitting && !confirmDelete}
        finalFocus={() =>
          returnFocus?.isConnected ? returnFocus : document.getElementById("account-list-heading")
        }
      >
        <SheetHeader className="border-b pr-14">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Account details
          </p>
          <SheetTitle className="text-2xl font-semibold tracking-tight">Edit account</SheetTitle>
          <SheetDescription>Update the details below, then save your changes.</SheetDescription>
        </SheetHeader>
        <AccountForm
          mode="edit"
          defaultValues={{
            name: account.name,
            description: account.description ?? "",
            openingBalance: account.openingBalance,
          }}
          onSubmit={handleUpdate}
          onCancel={onClose}
          onSubmittingChange={setSubmitting}
          disabled={confirmDelete}
          secondaryAction={
            <DeleteAccountDialog
              account={account}
              disabled={submitting}
              onClose={onClose}
              onOpenChange={setConfirmDelete}
            />
          }
        />
      </SheetContent>
    </Sheet>
  );
}
