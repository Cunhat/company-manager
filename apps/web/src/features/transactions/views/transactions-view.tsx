import { CreateTransactionDialog } from "../components/create-transaction-dialog";
import ListTransactions from "../sections/list-transactions";

export default function TransactionsView() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Other income and expenses, separate from your invoices and expense
            records.
          </p>
        </div>
        <CreateTransactionDialog />
      </div>
      <ListTransactions />
    </div>
  );
}
