import { CreateInvoiceDialog } from "@/features/invoices/components/create-invoice-dialog";
import ListInvoices from "../sections/list-invoices";

export default function InvoicesView() {
  return (
    <div className="flex min-w-0 flex-col gap-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Invoices</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your invoices, all in one place.
          </p>
        </div>
        <CreateInvoiceDialog />
      </div>
      <ListInvoices />
    </div>
  );
}
