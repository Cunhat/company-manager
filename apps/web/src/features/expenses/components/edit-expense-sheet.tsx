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
import type { Expense } from "../schemas/types";
import { getExpensesQuery, updateExpenseMutation } from "../server/functions";
import { ExpenseForm, type ExpenseFormValues } from "./expense-form";
import { DeleteExpenseDialog } from "./delete-expense-dialog";

export function EditExpenseSheet({
  expense,
  onClose,
  returnFocus,
}: {
  expense: Expense;
  onClose: () => void;
  returnFocus: HTMLElement | null;
}) {
  const client = useQueryClient();
  const update = useMutation(updateExpenseMutation);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdate(values: ExpenseFormValues) {
    const updated = await update.mutateAsync({ ...values, id: expense.id });
    client.setQueryData(getExpensesQuery.queryKey, (expenses) =>
      expenses
        ?.map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
    void client.invalidateQueries(getExpensesQuery);
    toast.success("Expense updated");
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
          returnFocus?.isConnected ? returnFocus : document.getElementById("expense-list-heading")
        }
      >
        <SheetHeader className="border-b pr-14">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Expense details
          </p>
          <SheetTitle className="text-2xl font-semibold tracking-tight">Edit expense</SheetTitle>
          <SheetDescription>Update the details below, then save your changes.</SheetDescription>
        </SheetHeader>
        <ExpenseForm
          mode="edit"
          defaultValues={{
            title: expense.title,
            value: expense.value,
            date: new Date(expense.createdAt).toISOString().slice(0, 10),
            iva: expense.iva,
          }}
          onSubmit={handleUpdate}
          onCancel={onClose}
          onSubmittingChange={setSubmitting}
          disabled={confirmDelete}
          secondaryAction={
            <DeleteExpenseDialog
              expense={expense}
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
