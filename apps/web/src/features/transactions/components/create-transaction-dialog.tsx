import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { createTransactionMutation } from "../server/functions";
import { TransactionForm, type TransactionFormValues } from "./transaction-form";

export function CreateTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const client = useQueryClient();
  const create = useMutation(createTransactionMutation);

  async function handleCreate(values: TransactionFormValues) {
    await create.mutateAsync(values);
    void invalidateAccountData(client);
    toast.success("Transaction created");
    setOpen(false);
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!submitting) setOpen(nextOpen);
      }}
    >
      <AlertDialogTrigger render={<Button />}>
        <IconPlus data-icon="inline-start" />
        New transaction
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader className="p-6 pb-0">
          <AlertDialogTitle>New transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Record a separate income or expense. Do not re-enter invoice or expense payments here.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open ? (
          <TransactionForm
            mode="create"
            defaultValues={{
              description: "",
              value: "",
              type: "expense",
              accountId: "",
              date: format(new Date(), "yyyy-MM-dd"),
            }}
            onSubmit={handleCreate}
            onCancel={() => setOpen(false)}
            onSubmittingChange={setSubmitting}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
