import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountSelect } from "@/features/accounts/components/account-select";
import { invalidateAccountData } from "@/features/accounts/lib/invalidate";
import { closeQuarterMutation } from "../server/functions";
import { cents, closeBlocker, formatCents, type IvaQuarter } from "../lib/quarters";

export function CloseQuarterDialog({
  quarter,
  onClose,
}: {
  quarter: IvaQuarter;
  onClose: () => void;
}) {
  const [government, setGovernment] = useState(
    quarter.governmentCents === null ? "" : (quarter.governmentCents / 100).toFixed(2),
  );
  const [accountId, setAccountId] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation(closeQuarterMutation);
  const client = useQueryClient();
  const amount = cents(government);
  const difference = amount === null ? null : amount - quarter.payableCents;
  const blocker = closeBlocker(quarter);
  const needsPayment = quarter.paymentTransactionId === null && quarter.payableCents > 0;
  const canClose = !blocker && difference === 0 && (!needsPayment || (accountId && paymentDate));
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        showCloseButton={!mutation.isPending}
        className="max-h-[90dvh] overflow-y-auto sm:max-w-lg"
      >
        <DialogHeader>
          <DialogTitle>
            Close Q{quarter.quarter} {quarter.year}
          </DialogTitle>
          <DialogDescription>
            Match the government amount to your records. Closing locks this quarter’s invoices and
            expenses.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!canClose || mutation.isPending) return;
            setError(null);
            try {
              await mutation.mutateAsync({
                year: quarter.year,
                quarter: quarter.quarter,
                governmentAmount: government,
                ...(needsPayment ? { accountId, paymentDate } : {}),
              });
              await invalidateAccountData(client);
              toast.success("Quarter closed");
              onClose();
            } catch (cause) {
              setError(cause instanceof Error ? cause.message : "Could not close the quarter.");
            }
          }}
        >
          <dl className="space-y-2 rounded-lg bg-muted/50 p-4 text-sm tabular-nums">
            <div className="flex justify-between gap-3">
              <dt>Invoice IVA</dt>
              <dd>{formatCents(quarter.salesCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>Expense deductions</dt>
              <dd>−{formatCents(quarter.deductionsCents)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt>From previous quarter</dt>
              <dd>−{formatCents(quarter.carryInCents)}</dd>
            </div>
            <div className="flex justify-between gap-3 border-t pt-3 font-semibold">
              <dt>Calculated payment</dt>
              <dd>{formatCents(quarter.payableCents)}</dd>
            </div>
            <div className="flex justify-between gap-3 text-muted-foreground">
              <dt>Deduction carried forward</dt>
              <dd>{formatCents(quarter.carryOutCents)}</dd>
            </div>
          </dl>
          <div className="space-y-2">
            <label htmlFor="government-amount" className="text-sm font-medium">
              Government IVA amount (€)
            </label>
            <Input
              id="government-amount"
              inputMode="decimal"
              required
              value={government}
              readOnly={quarter.governmentCents !== null}
              disabled={mutation.isPending}
              onChange={(event) => setGovernment(event.target.value)}
              aria-describedby="iva-difference"
            />
            <p
              id="iva-difference"
              aria-live="polite"
              className={`text-sm ${difference !== null && difference !== 0 ? "text-destructive" : "text-muted-foreground"}`}
            >
              {difference === null
                ? "Enter the amount shown by the government."
                : difference === 0
                  ? "The amounts match exactly."
                  : `Difference: ${formatCents(difference)}. Check your invoices and expenses before closing.`}
            </p>
          </div>
          {needsPayment ? (
            <fieldset disabled={mutation.isPending} className="space-y-4">
              <AccountSelect
                id="iva-payment-account"
                value={accountId}
                onChange={setAccountId}
                onBlur={() => {}}
                disabled={mutation.isPending}
              />
              <div className="space-y-2">
                <label htmlFor="iva-payment-date" className="text-sm font-medium">
                  Payment date
                </label>
                <Input
                  id="iva-payment-date"
                  type="date"
                  required
                  value={paymentDate}
                  onChange={(event) => setPaymentDate(event.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                An expense transaction for {formatCents(quarter.payableCents)} will be recorded in
                this account.
              </p>
            </fieldset>
          ) : (
            <p className="text-sm text-muted-foreground">
              {quarter.payableCents === 0
                ? "There is no payment due. No transaction will be created."
                : "The existing payment transaction will be retained."}
            </p>
          )}
          {blocker || error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error ?? blocker}
            </p>
          ) : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!canClose || mutation.isPending}>
              {mutation.isPending
                ? "Closing..."
                : needsPayment
                  ? "Record payment and close"
                  : "Close quarter"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
