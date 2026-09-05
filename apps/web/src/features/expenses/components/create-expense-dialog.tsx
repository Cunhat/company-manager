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
import { createExpenseMutation, getExpensesQuery } from "../server/functions";
import { ExpenseForm, type ExpenseFormValues } from "./expense-form";

export function CreateExpenseDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const client = useQueryClient();
  const create = useMutation(createExpenseMutation);

  async function handleCreate(values: ExpenseFormValues) {
    await create.mutateAsync(values);
    void client.invalidateQueries(getExpensesQuery);
    toast.success("Expense created");
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
        New expense
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader className="p-6 pb-0">
          <AlertDialogTitle>New expense</AlertDialogTitle>
          <AlertDialogDescription>Fill in the expense details.</AlertDialogDescription>
        </AlertDialogHeader>
        {open ? (
          <ExpenseForm
            mode="create"
            defaultValues={{
              title: "",
              value: "",
              date: format(new Date(), "yyyy-MM-dd"),
              iva: false,
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
