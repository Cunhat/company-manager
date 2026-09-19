import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { IconPlus } from "@tabler/icons-react";
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
import { createAccountMutation } from "../server/functions";
import { AccountForm, type AccountFormValues } from "./account-form";

export function CreateAccountDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const client = useQueryClient();
  const create = useMutation(createAccountMutation);

  async function handleCreate(values: AccountFormValues) {
    await create.mutateAsync(values);
    void invalidateAccountData(client);
    toast.success("Account created");
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
        New account
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader className="p-6 pb-0">
          <AlertDialogTitle>New account</AlertDialogTitle>
          <AlertDialogDescription>
            Name your account and set its opening balance.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open ? (
          <AccountForm
            mode="create"
            defaultValues={{ name: "", description: "", openingBalance: "0" }}
            onSubmit={handleCreate}
            onCancel={() => setOpen(false)}
            onSubmittingChange={setSubmitting}
          />
        ) : null}
      </AlertDialogContent>
    </AlertDialog>
  );
}
