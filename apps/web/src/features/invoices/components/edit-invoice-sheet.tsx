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
import type { Invoice } from "../schemas/types";
import { getInvoicesQuery, updateInvoiceMutation } from "../server/functions";
import { InvoiceForm, type InvoiceFormValues } from "./invoice-form";
import { DeleteInvoiceDialog } from "./delete-invoice-dialog";

export function EditInvoiceSheet({
  invoice,
  onClose,
  returnFocus,
}: {
  invoice: Invoice;
  onClose: () => void;
  returnFocus: HTMLElement | null;
}) {
  const client = useQueryClient();
  const update = useMutation(updateInvoiceMutation);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function handleUpdate(values: InvoiceFormValues) {
    const updated = await update.mutateAsync({ ...values, id: invoice.id });
    client.setQueryData(getInvoicesQuery.queryKey, (invoices) =>
      invoices
        ?.map((item) => (item.id === updated.id ? updated : item))
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    );
    void client.invalidateQueries(getInvoicesQuery);
    toast.success("Invoice updated");
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
          returnFocus?.isConnected ? returnFocus : document.getElementById("invoice-list-heading")
        }
      >
        <SheetHeader className="border-b pr-14">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Invoice details
          </p>
          <SheetTitle className="text-2xl font-semibold tracking-tight">Edit invoice</SheetTitle>
          <SheetDescription>Update the details below, then save your changes.</SheetDescription>
        </SheetHeader>
        <InvoiceForm
          mode="edit"
          defaultValues={{
            name: invoice.name,
            description: invoice.description ?? "",
            value: String(invoice.value),
            date: new Date(invoice.createdAt).toISOString().slice(0, 10),
            status: invoice.status,
          }}
          onSubmit={handleUpdate}
          onCancel={onClose}
          onSubmittingChange={setSubmitting}
          disabled={confirmDelete}
          secondaryAction={
            <DeleteInvoiceDialog
              invoice={invoice}
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
