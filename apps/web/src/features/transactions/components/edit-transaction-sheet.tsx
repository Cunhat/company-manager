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
import type { Transaction } from "../schemas/types";
import { updateTransactionMutation } from "../server/functions";
import { TransactionForm, type TransactionFormValues } from "./transaction-form";
import { DeleteTransactionDialog } from "./delete-transaction-dialog";

export function EditTransactionSheet({
  transaction,
  onClose,
  returnFocus,
}: {
  transaction: Transaction;
  onClose: () => void;
  returnFocus: HTMLElement | null;
}) {
  const client = useQueryClient();
  const update = useMutation(updateTransactionMutation);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdate(values: TransactionFormValues) {
    await update.mutateAsync({ ...values, id: transaction.id });
    void invalidateAccountData(client);
    toast.success("Transaction updated");
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
          returnFocus?.isConnected
            ? returnFocus
            : document.getElementById("transaction-list-heading")
        }
      >
        <SheetHeader className="border-b pr-14">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Transaction details
          </p>
          <SheetTitle className="text-2xl font-semibold tracking-tight">
            Edit transaction
          </SheetTitle>
          <SheetDescription>Update the details below, then save your changes.</SheetDescription>
        </SheetHeader>
        <TransactionForm
          mode="edit"
          defaultValues={{
            description: transaction.description ?? "",
            value: transaction.value,
            type: transaction.type,
            accountId: transaction.accountId,
            date: new Date(transaction.createdAt).toISOString().slice(0, 10),
          }}
          onSubmit={handleUpdate}
          onCancel={onClose}
          onSubmittingChange={setSubmitting}
          disabled={confirmDelete}
          secondaryAction={
            <DeleteTransactionDialog
              transaction={transaction}
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
