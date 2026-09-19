import { CreateAccountDialog } from "../components/create-account-dialog";
import ListAccounts from "../sections/list-accounts";

export default function AccountsView() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Accounts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your balances, including paid invoices, expenses and manual
            transactions.
          </p>
        </div>
        <CreateAccountDialog />
      </div>
      <ListAccounts />
    </div>
  );
}
