import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AccountSelect } from "@/features/accounts/components/account-select";
import dayjs from "@/features/kms/lib/dates";
import { DEFAULT_VALUES, KIND_LABELS, money, NO_TRAVEL, PAYMENT_LABELS } from "../lib/calculations";
import { DeleteSalaryDialog } from "./delete-salary-dialog";
import { SalaryEditor } from "./salary-editor";
import {
  applyPayroll,
  deletePayroll,
  generatePayroll,
  getSalaryTravelQuery,
  payPayroll,
  saveSalarySettings,
  unpayPayroll,
  type SalaryData,
  type SalaryPayment,
  type SalaryRecord,
} from "../server/functions";
import type { PaymentKind, PayrollKind } from "../schemas/validators";

export function SettingsDialog({
  data,
  onClose,
  onSaved,
}: {
  data: SalaryData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [accountId, setAccountId] = useState(data.settings?.accountId ?? "");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Salary settings</DialogTitle>
          <DialogDescription>
            Your starting values for new payroll records. Existing months keep their saved values.
          </DialogDescription>
        </DialogHeader>
        <SalaryEditor
          initial={{ ...(data.settings ?? DEFAULT_VALUES), irsOverrideCents: null }}
          kind="monthly"
          travel={NO_TRAVEL}
          allowOverride={false}
          action="Save salary settings"
          disabled={!accountId}
          busy={busy}
          onSave={async (values) => {
            setBusy(true);
            try {
              await saveSalarySettings({ data: { values, accountId } });
              await onSaved();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          <AccountSelect
            id="salary-default-account"
            value={accountId}
            onChange={setAccountId}
            onBlur={() => {}}
            disabled={busy}
          />
        </SalaryEditor>
      </DialogContent>
    </Dialog>
  );
}

export function GenerateDialog({
  userId,
  month,
  data,
  onClose,
  onSaved,
}: {
  userId: string;
  month: string;
  data: SalaryData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [kind, setKind] = useState<PayrollKind>("monthly");
  const [busy, setBusy] = useState(false);
  const travel = useQuery({ ...getSalaryTravelQuery(userId, month), enabled: kind === "monthly" });
  const exists = data.records.some(
    (r) =>
      r.kind === kind &&
      (kind === "monthly" ? r.month === month : r.month.slice(0, 4) === month.slice(0, 4)),
  );
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl" showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>Generate payroll · {month}</DialogTitle>
          <DialogDescription>Review the amounts before saving this record.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Payroll type">
          {Object.entries(KIND_LABELS).map(([value, label]) => (
            <Button
              key={value}
              variant={kind === value ? "default" : "outline"}
              disabled={busy}
              aria-pressed={kind === value}
              onClick={() => setKind(value as PayrollKind)}
            >
              {label}
            </Button>
          ))}
        </div>
        {exists ? (
          <p role="status" className="rounded-lg bg-muted p-4 text-sm">
            This {kind === "monthly" ? "month's salary" : "year's bonus"} already exists. Open the
            saved record to edit its values.
          </p>
        ) : (
          <SalaryEditor
            key={kind}
            initial={{ ...(data.settings ?? DEFAULT_VALUES), irsOverrideCents: null }}
            kind={kind}
            travel={kind === "monthly" ? (travel.data ?? NO_TRAVEL) : NO_TRAVEL}
            action={kind === "monthly" ? "Generate & close month" : "Generate bonus"}
            busy={busy}
            disabled={kind === "monthly" && (!travel.isSuccess || travel.isFetching)}
            onSave={async (values) => {
              setBusy(true);
              try {
                await generatePayroll({
                  data: {
                    month,
                    kind,
                    values,
                    expected: kind === "monthly" ? travel.data! : NO_TRAVEL,
                  },
                });
                await onSaved();
                onClose();
              } finally {
                setBusy(false);
              }
            }}
          >
            <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
              {kind === "monthly"
                ? "Includes this month's saved per diems and mileage. Generating closes these travel entries to additions, edits and removals. Salary values remain editable."
                : "Gross salary only. This bonus does not close the travel month. One of each bonus is available per calendar year."}
            </p>
            {kind === "monthly" && travel.isPending ? (
              <p role="status">Loading travel amounts...</p>
            ) : null}
            {kind === "monthly" && travel.isSuccess ? (
              <Button
                type="button"
                variant="link"
                disabled={busy || travel.isFetching}
                onClick={() => void travel.refetch()}
              >
                {travel.isFetching ? "Refreshing..." : "Refresh travel amounts"}
              </Button>
            ) : null}
            {kind === "monthly" && travel.isError ? (
              <div role="alert">
                Could not load travel amounts.{" "}
                <Button variant="link" onClick={() => void travel.refetch()}>
                  Try again
                </Button>
              </div>
            ) : null}
          </SalaryEditor>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function EditSalaryDialog({
  record,
  hasPayments,
  onClose,
  onSaved,
}: {
  record: SalaryRecord;
  hasPayments: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy && !confirmDelete) onClose();
      }}
    >
      <DialogContent
        className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl"
        showCloseButton={!busy && !confirmDelete}
      >
        <DialogHeader>
          <DialogTitle>Edit · {KIND_LABELS[record.kind]}</DialogTitle>
          <DialogDescription>
            Try different values for {record.month}. Nothing is saved until you apply changes.
          </DialogDescription>
        </DialogHeader>
        <SalaryEditor
          initial={record}
          kind={record.kind}
          travel={record}
          action="Apply changes"
          busy={busy}
          disabled={confirmDelete}
          secondaryAction={
            <DeleteSalaryDialog
              month={record.month}
              kind={record.kind}
              disabled={busy}
              onOpenChange={setConfirmDelete}
              onDelete={async () => {
                setBusy(true);
                try {
                  await deletePayroll({ data: { id: record.id, revision: record.revision } });
                  await onSaved();
                  onClose();
                } finally {
                  setBusy(false);
                }
              }}
            />
          }
          onSave={async (values) => {
            setBusy(true);
            try {
              await applyPayroll({ data: { id: record.id, revision: record.revision, values } });
              await onSaved();
              onClose();
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
            {hasPayments
              ? "Applying changes also updates the amounts of linked paid expenses and tax transactions. Their payment dates and accounts stay the same."
              : "Applying changes updates this record only. Your default salary settings stay the same."}{" "}
            {record.kind === "monthly"
              ? "Travel totals stay as recorded when this month was closed."
              : ""}
          </p>
        </SalaryEditor>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentDialog({
  record,
  kind,
  payment,
  usualAccount,
  onClose,
  onSaved,
}: {
  record: SalaryRecord;
  kind: PaymentKind;
  payment?: SalaryPayment;
  usualAccount: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [accountId, setAccountId] = useState(usualAccount);
  const [date, setDate] = useState(() => dayjs().format("YYYY-MM-DD"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const amount =
    kind === "salary"
      ? record.netCents
      : kind === "ss"
        ? record.ssCents + record.tsuCents
        : record.irsCents;
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>{payment ? "Undo payment" : "Record payment"}</DialogTitle>
          <DialogDescription>
            {PAYMENT_LABELS[kind]} · {record.month} · {money(amount)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (busy) return;
            setBusy(true);
            setError(null);
            try {
              if (payment) await unpayPayroll({ data: { id: record.id, kind } });
              else
                await payPayroll({
                  data: { id: record.id, kind, revision: record.revision, accountId, date },
                });
              await onSaved();
              onClose();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not update payment.");
            } finally {
              setBusy(false);
            }
          }}
        >
          {payment ? (
            <p className="text-sm text-muted-foreground">
              This removes the linked {kind === "salary" ? "expense" : "expense transaction"} and
              marks the payment as unpaid. Use this to correct a payment's date or account, then
              record it again.
            </p>
          ) : (
            <>
              <AccountSelect
                id="payroll-payment-account"
                value={accountId}
                onChange={setAccountId}
                onBlur={() => {}}
                disabled={busy}
              />
              <div>
                <label htmlFor="payroll-payment-date" className="mb-2 block text-sm font-medium">
                  Payment date
                </label>
                <Input
                  id="payroll-payment-date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  disabled={busy}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {kind === "salary"
                  ? "Creates an expense without IVA"
                  : "Creates a transaction of type Expense"}{" "}
                on this date. Payroll metrics stay in {record.month}.
              </p>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant={payment ? "destructive" : "default"}
              disabled={busy || (!payment && (!accountId || !date))}
            >
              {busy
                ? "Saving..."
                : payment
                  ? `Undo payment & remove ${kind === "salary" ? "expense" : "transaction"}`
                  : "Mark as paid"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
