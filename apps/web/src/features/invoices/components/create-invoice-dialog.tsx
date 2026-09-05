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
import { createInvoiceMutation, getInvoicesQuery } from "../server/functions";
import { InvoiceForm, type InvoiceFormValues } from "./invoice-form";

export function CreateInvoiceDialog() {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const client = useQueryClient();
  const create = useMutation(createInvoiceMutation);

  async function handleCreate(values: InvoiceFormValues) {
    await create.mutateAsync(values);
    void client.invalidateQueries(getInvoicesQuery);
    toast.success("Invoice created");
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
        New invoice
      </AlertDialogTrigger>
      <AlertDialogContent className="max-h-[calc(100dvh-2rem)] gap-0 overflow-y-auto p-0 data-[size=default]:sm:max-w-lg">
        <AlertDialogHeader className="p-6 pb-0">
          <AlertDialogTitle>New invoice</AlertDialogTitle>
          <AlertDialogDescription>
            Fill in the invoice details.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {open ? (
          <InvoiceForm
            mode="create"
            defaultValues={{
              name: "",
              description: "",
              value: "",
              date: format(new Date(), "yyyy-MM-dd"),
              status: "pending",
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
